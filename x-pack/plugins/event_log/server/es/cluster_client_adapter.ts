/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { reject, isUndefined } from 'lodash';
import { SearchResponse, Client } from 'elasticsearch';
import { Logger, LegacyClusterClient } from '../../../../../src/core/server';
import { IEvent, SAVED_OBJECT_REL_PRIMARY } from '../types';
import { FindOptionsType } from '../event_log_client';

export type EsClusterClient = Pick<LegacyClusterClient, 'callAsInternalUser' | 'asScoped'>;
export type IClusterClientAdapter = PublicMethodsOf<ClusterClientAdapter>;

export interface ConstructorOpts {
  logger: Logger;
  clusterClientPromise: Promise<EsClusterClient>;
}

export interface QueryEventsBySavedObjectResult {
  page: number;
  per_page: number;
  total: number;
  data: IEvent[];
}

export class ClusterClientAdapter {
  private readonly logger: Logger;
  private readonly clusterClientPromise: Promise<EsClusterClient>;

  constructor(opts: ConstructorOpts) {
    this.logger = opts.logger;
    this.clusterClientPromise = opts.clusterClientPromise;
  }

  public async indexDocument(doc: unknown): Promise<void> {
    await this.callEs<ReturnType<Client['index']>>('index', doc);
  }

  public async doesIlmPolicyExist(policyName: string): Promise<boolean> {
    const request = {
      method: 'GET',
      path: `/_ilm/policy/${policyName}`,
    };
    try {
      await this.callEs('transport.request', request);
    } catch (err) {
      if (err.statusCode === 404) return false;
      throw new Error(`error checking existance of ilm policy: ${err.message}`);
    }
    return true;
  }

  public async createIlmPolicy(policyName: string, policy: unknown): Promise<void> {
    const request = {
      method: 'PUT',
      path: `/_ilm/policy/${policyName}`,
      body: policy,
    };
    try {
      await this.callEs('transport.request', request);
    } catch (err) {
      throw new Error(`error creating ilm policy: ${err.message}`);
    }
  }

  public async doesIndexTemplateExist(name: string): Promise<boolean> {
    let result;
    try {
      result = await this.callEs<ReturnType<Client['indices']['existsTemplate']>>(
        'indices.existsTemplate',
        { name }
      );
    } catch (err) {
      throw new Error(`error checking existance of index template: ${err.message}`);
    }
    return result as boolean;
  }

  public async createIndexTemplate(name: string, template: unknown): Promise<void> {
    const addTemplateParams = {
      name,
      create: true,
      body: template,
    };
    try {
      await this.callEs<ReturnType<Client['indices']['putTemplate']>>(
        'indices.putTemplate',
        addTemplateParams
      );
    } catch (err) {
      // The error message doesn't have a type attribute we can look to guarantee it's due
      // to the template already existing (only long message) so we'll check ourselves to see
      // if the template now exists. This scenario would happen if you startup multiple Kibana
      // instances at the same time.
      const existsNow = await this.doesIndexTemplateExist(name);
      if (!existsNow) {
        throw new Error(`error creating index template: ${err.message}`);
      }
    }
  }

  public async doesAliasExist(name: string): Promise<boolean> {
    let result;
    try {
      result = await this.callEs<ReturnType<Client['indices']['existsAlias']>>(
        'indices.existsAlias',
        { name }
      );
    } catch (err) {
      throw new Error(`error checking existance of initial index: ${err.message}`);
    }
    return result as boolean;
  }

  public async createIndex(name: string, body: unknown = {}): Promise<void> {
    try {
      await this.callEs<ReturnType<Client['indices']['create']>>('indices.create', {
        index: name,
        body,
      });
    } catch (err) {
      if (err.body?.error?.type !== 'resource_already_exists_exception') {
        throw new Error(`error creating initial index: ${err.message}`);
      }
    }
  }

  public async queryEventsBySavedObject(
    index: string,
    type: string,
    id: string,
    { page, per_page: perPage, start, end, sort_field, sort_order }: FindOptionsType
  ): Promise<QueryEventsBySavedObjectResult> {
    try {
      const {
        hits: { hits, total },
      }: SearchResponse<unknown> = await this.callEs('search', {
        index,
        // The SearchResponse type only supports total as an int,
        // so we're forced to explicitly request that it return as an int
        rest_total_hits_as_int: true,
        body: {
          size: perPage,
          from: (page - 1) * perPage,
          sort: { [sort_field]: { order: sort_order } },
          query: {
            bool: {
              must: reject(
                [
                  {
                    nested: {
                      path: 'kibana.saved_objects',
                      query: {
                        bool: {
                          must: [
                            {
                              term: {
                                'kibana.saved_objects.rel': {
                                  value: SAVED_OBJECT_REL_PRIMARY,
                                },
                              },
                            },
                            {
                              term: {
                                'kibana.saved_objects.type': {
                                  value: type,
                                },
                              },
                            },
                            {
                              term: {
                                'kibana.saved_objects.id': {
                                  value: id,
                                },
                              },
                            },
                          ],
                        },
                      },
                    },
                  },
                  start && {
                    range: {
                      '@timestamp': {
                        gte: start,
                      },
                    },
                  },
                  end && {
                    range: {
                      '@timestamp': {
                        lte: end,
                      },
                    },
                  },
                ],
                isUndefined
              ),
            },
          },
        },
      });
      return {
        page,
        per_page: perPage,
        total,
        data: hits.map((hit) => hit._source) as IEvent[],
      };
    } catch (err) {
      throw new Error(
        `querying for Event Log by for type "${type}" and id "${id}" failed with: ${err.message}`
      );
    }
  }

  // We have a common problem typing ES-DSL Queries
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async callEs<ESQueryResult = unknown>(operation: string, body?: any) {
    try {
      this.debug(`callEs(${operation}) calls:`, body);
      const clusterClient = await this.clusterClientPromise;
      const result = await clusterClient.callAsInternalUser(operation, body);
      this.debug(`callEs(${operation}) result:`, result);
      return result as ESQueryResult;
    } catch (err) {
      this.debug(`callEs(${operation}) error:`, {
        message: err.message,
        statusCode: err.statusCode,
      });
      throw err;
    }
  }

  private debug(message: string, object?: unknown) {
    const objectString = object == null ? '' : JSON.stringify(object);
    this.logger.debug(`esContext: ${message} ${objectString}`);
  }
}
