/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Subject } from 'rxjs';
import { bufferTime, filter as rxFilter, switchMap } from 'rxjs/operators';
import { reject, isUndefined } from 'lodash';
import type { PublicMethodsOf } from '@kbn/utility-types';
import { Logger, ElasticsearchClient } from 'src/core/server';
import { EsContext } from '.';
import { IEvent, IValidatedEvent, SAVED_OBJECT_REL_PRIMARY } from '../types';
import { FindOptionsType } from '../event_log_client';
import { esKuery } from '../../../../../src/plugins/data/server';

export const EVENT_BUFFER_TIME = 1000; // milliseconds
export const EVENT_BUFFER_LENGTH = 100;

export type IClusterClientAdapter = PublicMethodsOf<ClusterClientAdapter>;

export interface Doc {
  index: string;
  body: IEvent;
}

export interface ConstructorOpts {
  logger: Logger;
  elasticsearchClientPromise: Promise<ElasticsearchClient>;
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
  private readonly elasticsearchClientPromise: Promise<ElasticsearchClient>;
  private readonly docBuffer$: Subject<Doc>;
  private readonly context: EsContext;
  private readonly docsBufferedFlushed: Promise<void>;

  constructor(opts: ConstructorOpts) {
    this.logger = opts.logger;
    this.elasticsearchClientPromise = opts.elasticsearchClientPromise;
    this.context = opts.context;
    this.docBuffer$ = new Subject<Doc>();

    // buffer event log docs for time / buffer length, ignore empty
    // buffers, then index the buffered docs; kick things off with a
    // promise on the observable, which we'll wait on in shutdown
    this.docsBufferedFlushed = this.docBuffer$
      .pipe(
        bufferTime(EVENT_BUFFER_TIME, null, EVENT_BUFFER_LENGTH),
        rxFilter((docs) => docs.length > 0),
        switchMap(async (docs) => await this.indexDocuments(docs))
      )
      .toPromise();
  }

  // This will be called at plugin stop() time; the assumption is any plugins
  // depending on the event_log will already be stopped, and so will not be
  // writing more event docs.  We complete the docBuffer$ observable,
  // and wait for the docsBufffered$ observable to complete via it's promise,
  // and so should end up writing all events out that pass through, before
  // Kibana shuts down (cleanly).
  public async shutdown(): Promise<void> {
    this.docBuffer$.complete();
    await this.docsBufferedFlushed;
  }

  public indexDocument(doc: Doc): void {
    this.docBuffer$.next(doc);
  }

  async indexDocuments(docs: Doc[]): Promise<void> {
    // If es initialization failed, don't try to index.
    // Also, don't log here, we log the failure case in plugin startup
    // instead, otherwise we'd be spamming the log (if done here)
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
      const esClient = await this.elasticsearchClientPromise;
      await esClient.bulk({ body: bulkBody });
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
      const esClient = await this.elasticsearchClientPromise;
      await esClient.transport.request(request);
    } catch (err) {
      if (err.statusCode === 404) return false;
      throw new Error(`error checking existance of ilm policy: ${err.message}`);
    }
    return true;
  }

  public async createIlmPolicy(policyName: string, policy: Record<string, unknown>): Promise<void> {
    const request = {
      method: 'PUT',
      path: `/_ilm/policy/${policyName}`,
      body: policy,
    };
    try {
      const esClient = await this.elasticsearchClientPromise;
      await esClient.transport.request(request);
    } catch (err) {
      throw new Error(`error creating ilm policy: ${err.message}`);
    }
  }

  public async doesIndexTemplateExist(name: string): Promise<boolean> {
    let result;
    try {
      const esClient = await this.elasticsearchClientPromise;
      result = (await esClient.indices.existsTemplate({ name })).body;
    } catch (err) {
      throw new Error(`error checking existance of index template: ${err.message}`);
    }
    return result as boolean;
  }

  public async createIndexTemplate(name: string, template: Record<string, unknown>): Promise<void> {
    try {
      const esClient = await this.elasticsearchClientPromise;
      await esClient.indices.putTemplate({ name, body: template, create: true });
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
      const esClient = await this.elasticsearchClientPromise;
      result = (await esClient.indices.existsAlias({ name })).body;
    } catch (err) {
      throw new Error(`error checking existance of initial index: ${err.message}`);
    }
    return result as boolean;
  }

  public async createIndex(
    name: string,
    body: string | Record<string, unknown> = {}
  ): Promise<void> {
    try {
      const esClient = await this.elasticsearchClientPromise;
      await esClient.indices.create({
        index: name,
        body,
      });
    } catch (err) {
      if (err.body?.error?.type !== 'resource_already_exists_exception') {
        throw new Error(`error creating initial index: ${err.message}`);
      }
    }
  }

  public async queryEventsBySavedObjects(
    index: string,
    namespace: string | undefined,
    type: string,
    ids: string[],
    // eslint-disable-next-line @typescript-eslint/naming-convention
    { page, per_page: perPage, start, end, sort_field, sort_order, filter }: FindOptionsType
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

    const esClient = await this.elasticsearchClientPromise;
    let dslFilterQuery;
    try {
      dslFilterQuery = filter
        ? esKuery.toElasticsearchQuery(esKuery.fromKueryExpression(filter))
        : [];
    } catch (err) {
      this.debug(`Invalid kuery syntax for the filter (${filter}) error:`, {
        message: err.message,
        statusCode: err.statusCode,
      });
      throw err;
    }
    const body = {
      size: perPage,
      from: (page - 1) * perPage,
      sort: { [sort_field]: { order: sort_order } },
      query: {
        bool: {
          filter: dslFilterQuery,
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
                          terms: {
                            // default maximum of 65,536 terms, configurable by index.max_terms_count
                            'kibana.saved_objects.id': ids,
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
        body: {
          hits: { hits, total },
        },
      } = await esClient.search({
        index,
        track_total_hits: true,
        body,
      });
      return {
        page,
        per_page: perPage,
        total: total.value,
        data: hits.map((hit: { _source: unknown }) => hit._source) as IValidatedEvent[],
      };
    } catch (err) {
      throw new Error(
        `querying for Event Log by for type "${type}" and ids "${ids}" failed with: ${err.message}`
      );
    }
  }

  private debug(message: string, object?: unknown) {
    const objectString = object == null ? '' : JSON.stringify(object);
    this.logger.debug(`esContext: ${message} ${objectString}`);
  }
}
