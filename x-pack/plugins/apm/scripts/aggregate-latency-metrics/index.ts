/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Client } from '@elastic/elasticsearch';
import { argv } from 'yargs';
import pLimit from 'p-limit';
import pRetry from 'p-retry';
import { parse, format } from 'url';
import { unique, without, set, merge, flatten } from 'lodash';
import * as histogram from 'hdr-histogram-js';
import { ESSearchResponse } from '../../typings/elasticsearch';
import {
  HOST_NAME,
  SERVICE_NAME,
  TRANSACTION_NAME,
  TRANSACTION_TYPE,
  AGENT_NAME,
  SERVICE_ENVIRONMENT,
  POD_NAME,
  CONTAINER_ID,
  SERVICE_VERSION,
  TRANSACTION_RESULT,
  PROCESSOR_EVENT,
} from '../../common/elasticsearch_fieldnames';
import { stampLogger } from '../shared/stamp-logger';
import { createOrUpdateIndex } from '../shared/create-or-update-index';

// This script will try to estimate how many latency metric documents
// will be created based on the available transaction documents.
// It can also generate metric documents based on a painless script
// and hdr histograms.
//
// Options:
// - interval: the interval (in minutes) for which latency metrics will be aggregated.
// Defaults to 1.
// - concurrency: number of maximum concurrent requests to ES. Defaults to 3.
// - from: start of the date range that should be processed. Should be a valid ISO timestamp.
// - to: end of the date range that should be processed. Should be a valid ISO timestamp.
// - source: from which transaction documents should be read. Should be location of ES (basic auth
// is supported) plus the index name (or an index pattern). Example:
// https://foo:bar@apm.elstc.co:9999/apm-8.0.0-transaction
// - dest: to which metric documents should be written. If this is not set, no metric documents
// will be created.Should be location of ES (basic auth is supported) plus the index name.
// Example: https://foo:bar@apm.elstc.co:9999/apm-8.0.0-metric
// - include: comma-separated list of fields that should be aggregated on, in addition to the
// default ones.
// - exclude: comma-separated list of fields that should be not be aggregated on.

stampLogger();

export async function aggregateLatencyMetrics() {
  const interval = parseInt(String(argv.interval), 10) || 1;
  const concurrency = parseInt(String(argv.concurrency), 10) || 3;
  const numSigFigures = (parseInt(String(argv.sigfig), 10) || 2) as
    | 1
    | 2
    | 3
    | 4
    | 5;

  const from = new Date(String(argv.from)).getTime();
  const to = new Date(String(argv.to)).getTime();

  if (isNaN(from) || isNaN(to)) {
    throw new Error(
      `from and to are not valid dates - please supply valid ISO timestamps`
    );
  }

  if (to <= from) {
    throw new Error('to cannot be earlier than from');
  }

  const limit = pLimit(concurrency);
  // retry function to handle ES timeouts
  const retry = (fn: (...args: any[]) => any) => {
    return () =>
      pRetry(fn, {
        factor: 1,
        retries: 3,
        minTimeout: 2500,
      });
  };

  const tasks: Array<Promise<void>> = [];

  const defaultFields = [
    SERVICE_NAME,
    SERVICE_VERSION,
    SERVICE_ENVIRONMENT,
    AGENT_NAME,
    HOST_NAME,
    POD_NAME,
    CONTAINER_ID,
    TRANSACTION_NAME,
    TRANSACTION_RESULT,
    TRANSACTION_TYPE,
  ];

  const include = String(argv.include ?? '')
    .split(',')
    .filter(Boolean) as string[];

  const exclude = String(argv.exclude ?? '')
    .split(',')
    .filter(Boolean) as string[];

  const only = String(argv.only ?? '')
    .split(',')
    .filter(Boolean) as string[];

  const fields = only.length
    ? unique(only)
    : without(unique([...include, ...defaultFields]), ...exclude);

  const globalFilter = argv.filter ? JSON.parse(String(argv.filter)) : {};

  // eslint-disable-next-line no-console
  console.log('Aggregating on', fields.join(','));

  const source = String(argv.source ?? '');
  const dest = String(argv.dest ?? '');

  function getClientOptionsFromIndexUrl(
    url: string
  ): { node: string; index: string } {
    const parsed = parse(url);
    const { pathname, ...rest } = parsed;

    return {
      node: format(rest),
      index: pathname!.replace('/', ''),
    };
  }

  const sourceOptions = getClientOptionsFromIndexUrl(source);

  const sourceClient = new Client({
    node: sourceOptions.node,
    ssl: {
      rejectUnauthorized: false,
    },
    requestTimeout: 120000,
  });

  let destClient: Client | undefined;
  let destOptions: { node: string; index: string } | undefined;

  const uploadMetrics = !!dest;

  if (uploadMetrics) {
    destOptions = getClientOptionsFromIndexUrl(dest);
    destClient = new Client({
      node: destOptions.node,
      ssl: {
        rejectUnauthorized: false,
      },
    });

    const mappings = (
      await sourceClient.indices.getMapping({
        index: sourceOptions.index,
      })
    ).body;

    const lastMapping = mappings[Object.keys(mappings)[0]];

    const newMapping = merge({}, lastMapping, {
      mappings: {
        properties: {
          transaction: {
            properties: {
              duration: {
                properties: {
                  histogram: {
                    type: 'histogram',
                  },
                },
              },
            },
          },
        },
      },
    });

    await createOrUpdateIndex({
      client: destClient,
      indexName: destOptions.index,
      clear: false,
      template: newMapping,
    });
  } else {
    // eslint-disable-next-line no-console
    console.log(
      'No destination was defined, not uploading aggregated documents'
    );
  }

  let at = to;
  while (at > from) {
    const end = at;
    const start = Math.max(from, at - interval * 60 * 1000);

    tasks.push(
      limit(
        retry(async () => {
          const filter = [
            {
              term: {
                [PROCESSOR_EVENT]: 'transaction',
              },
            },
            {
              range: {
                '@timestamp': {
                  gte: start,
                  lt: end,
                },
              },
            },
          ];

          const query: {
            query: Record<string, any>;
          } = {
            ...globalFilter,
            query: {
              ...(globalFilter?.query ?? {}),
              bool: {
                ...(globalFilter?.query?.bool ?? {}),
                filter: [
                  ...Object.values(globalFilter?.query?.bool?.filter ?? {}),
                  ...filter,
                ],
              },
            },
          };

          async function paginateThroughBuckets(
            buckets: Array<{
              doc_count: number;
              key: any;
              recorded_values?: { value: unknown };
            }>,
            after?: any
          ): Promise<
            Array<{
              doc_count: number;
              key: any;
              recorded_values?: { value: unknown };
            }>
          > {
            const params = {
              index: sourceOptions.index,
              body: {
                ...query,
                aggs: {
                  transactionGroups: {
                    composite: {
                      ...(after ? { after } : {}),
                      size: 10000,
                      sources: fields.map((field) => ({
                        [field]: {
                          terms: {
                            field,
                            missing_bucket: true,
                          },
                        },
                      })),
                    },
                    ...(dest
                      ? {
                          // scripted metric agg to get all the values (rather than downloading all the documents)
                          aggs: {
                            recorded_values: {
                              scripted_metric: {
                                init_script: 'state.values = new ArrayList()',
                                map_script: `
                            if (!doc['transaction.duration.us'].empty) {
                              state.values.add(doc['transaction.duration.us'].value);
                            }
                          `,
                                combine_script: 'return state.values',
                                reduce_script: `
                            return states.stream().flatMap(l -> l.stream()).collect(Collectors.toList())
                          `,
                              },
                            },
                          },
                        }
                      : {}),
                  },
                },
              },
            };

            const response = (await sourceClient.search(params))
              .body as ESSearchResponse<unknown, typeof params>;

            const { aggregations } = response;

            if (!aggregations) {
              return buckets;
            }

            const { transactionGroups } = aggregations;

            const nextBuckets = buckets.concat(transactionGroups.buckets);

            if (!transactionGroups.after_key) {
              return nextBuckets;
            }

            return nextBuckets.concat(
              await paginateThroughBuckets(buckets, transactionGroups.after_key)
            );
          }

          async function getNumberOfTransactionDocuments() {
            const params = {
              index: sourceOptions.index,
              body: {
                query: {
                  bool: {
                    filter,
                  },
                },
                track_total_hits: true,
              },
            };

            const response = (await sourceClient.search(params))
              .body as ESSearchResponse<unknown, typeof params>;

            return response.hits.total.value;
          }

          const [buckets, numberOfTransactionDocuments] = await Promise.all([
            paginateThroughBuckets([]),
            getNumberOfTransactionDocuments(),
          ]);

          const rangeLabel = `${new Date(start).toISOString()}-${new Date(
            end
          ).toISOString()}`;

          // eslint-disable-next-line no-console
          console.log(
            `${rangeLabel}: Compression: ${
              buckets.length
            }/${numberOfTransactionDocuments} (${(
              (buckets.length / numberOfTransactionDocuments) *
              100
            ).toPrecision(2)}%)`
          );

          const docs: Array<Record<string, any>> = [];

          if (uploadMetrics) {
            buckets.forEach((bucket) => {
              const values = (bucket.recorded_values?.value ?? []) as number[];
              const h = histogram.build({
                numberOfSignificantValueDigits: numSigFigures,
              });
              values.forEach((value) => {
                h.recordValue(value);
              });

              const iterator = h.recordedValuesIterator;

              const distribution = {
                values: [] as number[],
                counts: [] as number[],
              };

              iterator.reset();

              while (iterator.hasNext()) {
                const value = iterator.next();
                distribution.values.push(value.valueIteratedTo);
                distribution.counts.push(value.countAtValueIteratedTo);
              }

              const structured = Object.keys(bucket.key).reduce((prev, key) => {
                set(prev, key, bucket.key[key]);
                return prev;
              }, {});

              const doc = merge({}, structured, {
                '@timestamp': new Date(start).toISOString(),
                timestamp: {
                  us: start * 1000,
                },
                processor: {
                  name: 'metric',
                  event: 'metric',
                },
                transaction: {
                  duration: {
                    histogram: distribution,
                  },
                },
              });

              docs.push(doc);
            });

            if (!docs.length) {
              // eslint-disable-next-line no-console
              console.log(`${rangeLabel}: No docs to upload`);
              return;
            }

            const response = await destClient?.bulk({
              refresh: 'wait_for',
              body: flatten(
                docs.map((doc) => [
                  { index: { _index: destOptions?.index } },
                  doc,
                ])
              ),
            });

            if (response?.body.errors) {
              throw new Error(
                `${rangeLabel}: Could not upload all metric documents`
              );
            }
            // eslint-disable-next-line no-console
            console.log(
              `${rangeLabel}: Uploaded ${docs.length} metric documents`
            );
          }
        })
      )
    );
    at = start;
  }

  await Promise.all(tasks);
}
