/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Subject, Subscription } from 'rxjs';
import { bufferTime, filter, switchMap } from 'rxjs/operators';
import { reject, isUndefined } from 'lodash';
import { SearchResponse, Client } from 'elasticsearch';
import type { PublicMethodsOf } from '@kbn/utility-types';
import { Logger, LegacyClusterClient } from 'src/core/server';
import { ReadySignal, createReadySignal } from '../lib/ready_signal';
import { EsContext } from '.';
import { IEvent, IValidatedEvent, SAVED_OBJECT_REL_PRIMARY } from '../types';
import { FindOptionsType } from '../event_log_client';

export const EVENT_BUFFER_TIME = 1000; // milliseconds
export const EVENT_BUFFER_LENGTH = 100;

export type EsClusterClient = Pick<LegacyClusterClient, 'callAsInternalUser' | 'asScoped'>;
export type IClusterClientAdapter = PublicMethodsOf<ClusterClientAdapter>;

export interface Doc {
  index: string;
  body: IEvent;
}

export interface ConstructorOpts {
  logger: Logger;
  clusterClientPromise: Promise<EsClusterClient>;
  context: EsContext;
}

export interface QueryEventsBySavedObjectResult {
  page: number;
  per_page: number;
  total: number;
  data: IValidatedEvent[];
}

export class ClusterClientAdapter {
  private readonly logger: Logger;
  private readonly clusterClientPromise: Promise<EsClusterClient>;
  private readonly docBuffer$: Subject<Doc>;
  private readonly docsBufferedSubscription: Subscription;
  private readonly doneWriting: ReadySignal;
  private readonly context: EsContext;

  constructor(opts: ConstructorOpts) {
    this.logger = opts.logger;
    this.clusterClientPromise = opts.clusterClientPromise;
    this.context = opts.context;
    this.docBuffer$ = new Subject<Doc>();
    this.doneWriting = createReadySignal();

    // buffer event log docs for time / buffer length, ignore empty
    // buffers, then index the buffered docs
    const docsBuffered$ = this.docBuffer$.pipe(
      bufferTime(EVENT_BUFFER_TIME, null, EVENT_BUFFER_LENGTH),
      filter((docs) => docs.length > 0),
      switchMap(async (docs) => await this.indexDocuments(docs))
    );

    // kick everything off, when the stream closes, signal finished
    const { doneWriting } = this;
    this.docsBufferedSubscription = docsBuffered$.subscribe({
      complete() {
        doneWriting.signal();
      },
    });
  }

  // This will be called at plugin stop() time; the assumption is any plugins
  // depending on the event_log will already be stopped, and so will not be
  // writing more event docs.  So we shut down the docBuffer$ observable,
  // and wait for the docsBufffered$ observable to complete
  public async shutdown(): Promise<void> {
    this.docBuffer$.complete();
    await this.doneWriting.wait();
    this.docsBufferedSubscription.unsubscribe();
  }

  public indexDocument(doc: Doc): void {
    this.docBuffer$.next(doc);
  }

  async indexDocuments(docs: Doc[]): Promise<void> {
    // if es initialization failed, don't try to index
    if (!(await this.context.waitTillReady())) {
      return;
    }

    const bulkBody: Array<Record<string, unknown>> = [];

    for (const doc of docs) {
      if (doc.body === undefined) continue;

      bulkBody.push({ create: { _index: doc.index } });
      bulkBody.push(doc.body);
    }

    try {
      await this.callEs<ReturnType<Client['bulk']>>('bulk', { body: bulkBody });
    } catch (err) {
      this.logger.error(
        `error writing bulk events: "${err.message}"; docs: ${JSON.stringify(bulkBody)}`
      );
    }
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
    namespace: string | undefined,
    type: string,
    id: string,
    // eslint-disable-next-line @typescript-eslint/naming-convention
    { page, per_page: perPage, start, end, sort_field, sort_order }: FindOptionsType
  ): Promise<QueryEventsBySavedObjectResult> {
    const defaultNamespaceQuery = {
      bool: {
        must_not: {
          exists: {
            field: 'kibana.saved_objects.namespace',
          },
        },
      },
    };
    const namedNamespaceQuery = {
      term: {
        'kibana.saved_objects.namespace': {
          value: namespace,
        },
      },
    };
    const namespaceQuery = namespace === undefined ? defaultNamespaceQuery : namedNamespaceQuery;

    const body = {
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
                        namespaceQuery,
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
    };

    try {
      const {
        hits: { hits, total },
      }: SearchResponse<unknown> = await this.callEs('search', {
        index,
        // The SearchResponse type only supports total as an int,
        // so we're forced to explicitly request that it return as an int
        rest_total_hits_as_int: true,
        body,
      });
      return {
        page,
        per_page: perPage,
        total,
        data: hits.map((hit) => hit._source) as IValidatedEvent[],
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
