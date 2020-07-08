/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { flatten, merge, sortBy, sum } from 'lodash';
import { TelemetryTask } from '.';
import { AGENT_NAMES } from '../../../../common/agent_name';
import {
  AGENT_NAME,
  AGENT_VERSION,
  CLOUD_AVAILABILITY_ZONE,
  CLOUD_PROVIDER,
  CLOUD_REGION,
  ERROR_GROUP_ID,
  PARENT_ID,
  PROCESSOR_EVENT,
  SERVICE_FRAMEWORK_NAME,
  SERVICE_FRAMEWORK_VERSION,
  SERVICE_LANGUAGE_NAME,
  SERVICE_LANGUAGE_VERSION,
  SERVICE_NAME,
  SERVICE_RUNTIME_NAME,
  SERVICE_RUNTIME_VERSION,
  TRANSACTION_NAME,
  USER_AGENT_ORIGINAL,
} from '../../../../common/elasticsearch_fieldnames';
import { APMError } from '../../../../typings/es_schemas/ui/apm_error';
import { AgentName } from '../../../../typings/es_schemas/ui/fields/agent';
import { Span } from '../../../../typings/es_schemas/ui/span';
import { Transaction } from '../../../../typings/es_schemas/ui/transaction';
import { APMTelemetry } from '../types';

const TIME_RANGES = ['1d', 'all'] as const;
type TimeRange = typeof TIME_RANGES[number];

export const tasks: TelemetryTask[] = [
  {
    name: 'cloud',
    executor: async ({ indices, search }) => {
      function getBucketKeys({
        buckets,
      }: {
        buckets: Array<{
          doc_count: number;
          key: string | number;
        }>;
      }) {
        return buckets.map((bucket) => bucket.key as string);
      }

      const az = 'availability_zone';
      const region = 'region';
      const provider = 'provider';

      const response = await search({
        index: [
          indices['apm_oss.errorIndices'],
          indices['apm_oss.metricsIndices'],
          indices['apm_oss.spanIndices'],
          indices['apm_oss.transactionIndices'],
        ],
        body: {
          size: 0,
          aggs: {
            [az]: {
              terms: {
                field: CLOUD_AVAILABILITY_ZONE,
              },
            },
            [provider]: {
              terms: {
                field: CLOUD_PROVIDER,
              },
            },
            [region]: {
              terms: {
                field: CLOUD_REGION,
              },
            },
          },
        },
      });

      const { aggregations } = response;

      if (!aggregations) {
        return { cloud: { [az]: [], [provider]: [], [region]: [] } };
      }
      const cloud = {
        [az]: getBucketKeys(aggregations[az]),
        [provider]: getBucketKeys(aggregations[provider]),
        [region]: getBucketKeys(aggregations[region]),
      };
      return { cloud };
    },
  },
  {
    name: 'processor_events',
    executor: async ({ indices, search }) => {
      const indicesByProcessorEvent = {
        error: indices['apm_oss.errorIndices'],
        metric: indices['apm_oss.metricsIndices'],
        span: indices['apm_oss.spanIndices'],
        transaction: indices['apm_oss.transactionIndices'],
        onboarding: indices['apm_oss.onboardingIndices'],
        sourcemap: indices['apm_oss.sourcemapIndices'],
      };

      type ProcessorEvent = keyof typeof indicesByProcessorEvent;

      const jobs: Array<{
        processorEvent: ProcessorEvent;
        timeRange: TimeRange;
      }> = flatten(
        (Object.keys(
          indicesByProcessorEvent
        ) as ProcessorEvent[]).map((processorEvent) =>
          TIME_RANGES.map((timeRange) => ({ processorEvent, timeRange }))
        )
      );

      const allData = await jobs.reduce((prevJob, current) => {
        return prevJob.then(async (data) => {
          const { processorEvent, timeRange } = current;

          const totalHitsResponse = await search({
            index: indicesByProcessorEvent[processorEvent],
            body: {
              size: 0,
              query: {
                bool: {
                  filter: [
                    { term: { [PROCESSOR_EVENT]: processorEvent } },
                    ...(timeRange !== 'all'
                      ? [
                          {
                            range: {
                              '@timestamp': {
                                gte: `now-${timeRange}`,
                              },
                            },
                          },
                        ]
                      : []),
                  ],
                },
              },
              track_total_hits: true,
            },
          });

          const retainmentResponse =
            timeRange === 'all'
              ? await search({
                  index: indicesByProcessorEvent[processorEvent],
                  body: {
                    query: {
                      bool: {
                        filter: [
                          { term: { [PROCESSOR_EVENT]: processorEvent } },
                        ],
                      },
                    },
                    sort: {
                      '@timestamp': 'asc',
                    },
                    _source: ['@timestamp'],
                  },
                })
              : null;

          const event = retainmentResponse?.hits.hits[0]?._source as
            | {
                '@timestamp': number;
              }
            | undefined;

          return merge({}, data, {
            counts: {
              [processorEvent]: {
                [timeRange]: totalHitsResponse.hits.total.value,
              },
            },
            ...(event
              ? {
                  retainment: {
                    [processorEvent]: {
                      ms:
                        new Date().getTime() -
                        new Date(event['@timestamp']).getTime(),
                    },
                  },
                }
              : {}),
          });
        });
      }, Promise.resolve({} as Record<string, { counts: Record<ProcessorEvent, Record<TimeRange, number>> }>));

      return allData;
    },
  },
  {
    name: 'agent_configuration',
    executor: async ({ indices, search }) => {
      const agentConfigurationCount = (
        await search({
          index: indices.apmAgentConfigurationIndex,
          body: {
            size: 0,
            track_total_hits: true,
          },
        })
      ).hits.total.value;

      return {
        counts: {
          agent_configuration: {
            all: agentConfigurationCount,
          },
        },
      };
    },
  },
  {
    name: 'services',
    executor: async ({ indices, search }) => {
      const servicesPerAgent = await AGENT_NAMES.reduce(
        (prevJob, agentName) => {
          return prevJob.then(async (data) => {
            const response = await search({
              index: [
                indices['apm_oss.errorIndices'],
                indices['apm_oss.spanIndices'],
                indices['apm_oss.metricsIndices'],
                indices['apm_oss.transactionIndices'],
              ],
              body: {
                size: 0,
                query: {
                  bool: {
                    filter: [
                      {
                        term: {
                          [AGENT_NAME]: agentName,
                        },
                      },
                      {
                        range: {
                          '@timestamp': {
                            gte: 'now-1d',
                          },
                        },
                      },
                    ],
                  },
                },
                aggs: {
                  services: {
                    cardinality: {
                      field: SERVICE_NAME,
                    },
                  },
                },
              },
            });

            return {
              ...data,
              [agentName]: response.aggregations?.services.value || 0,
            };
          });
        },
        Promise.resolve({} as Record<AgentName, number>)
      );

      return {
        has_any_services: sum(Object.values(servicesPerAgent)) > 0,
        services_per_agent: servicesPerAgent,
      };
    },
  },
  {
    name: 'versions',
    executor: async ({ search, indices }) => {
      const response = await search({
        index: [
          indices['apm_oss.transactionIndices'],
          indices['apm_oss.spanIndices'],
          indices['apm_oss.errorIndices'],
        ],
        terminateAfter: 1,
        body: {
          query: {
            exists: {
              field: 'observer.version',
            },
          },
          size: 1,
          sort: {
            '@timestamp': 'desc',
          },
        },
      });

      const hit = response.hits.hits[0]?._source as Pick<
        Transaction | Span | APMError,
        'observer'
      >;

      if (!hit || !hit.observer?.version) {
        return {};
      }

      const [major, minor, patch] = hit.observer.version
        .split('.')
        .map((part) => Number(part));

      return {
        version: {
          apm_server: {
            major,
            minor,
            patch,
          },
        },
      };
    },
  },
  {
    name: 'groupings',
    executor: async ({ search, indices }) => {
      const range1d = { range: { '@timestamp': { gte: 'now-1d' } } };
      const errorGroupsCount = (
        await search({
          index: indices['apm_oss.errorIndices'],
          body: {
            size: 0,
            query: {
              bool: {
                filter: [{ term: { [PROCESSOR_EVENT]: 'error' } }, range1d],
              },
            },
            aggs: {
              top_service: {
                terms: {
                  field: SERVICE_NAME,
                  order: {
                    error_groups: 'desc',
                  },
                  size: 1,
                },
                aggs: {
                  error_groups: {
                    cardinality: {
                      field: ERROR_GROUP_ID,
                    },
                  },
                },
              },
            },
          },
        })
      ).aggregations?.top_service.buckets[0]?.error_groups.value;

      const transactionGroupsCount = (
        await search({
          index: indices['apm_oss.transactionIndices'],
          body: {
            size: 0,
            query: {
              bool: {
                filter: [
                  { term: { [PROCESSOR_EVENT]: 'transaction' } },
                  range1d,
                ],
              },
            },
            aggs: {
              top_service: {
                terms: {
                  field: SERVICE_NAME,
                  order: {
                    transaction_groups: 'desc',
                  },
                  size: 1,
                },
                aggs: {
                  transaction_groups: {
                    cardinality: {
                      field: TRANSACTION_NAME,
                    },
                  },
                },
              },
            },
          },
        })
      ).aggregations?.top_service.buckets[0]?.transaction_groups.value;

      const tracesPerDayCount = (
        await search({
          index: indices['apm_oss.transactionIndices'],
          body: {
            query: {
              bool: {
                filter: [
                  { term: { [PROCESSOR_EVENT]: 'transaction' } },
                  range1d,
                ],
                must_not: {
                  exists: { field: PARENT_ID },
                },
              },
            },
            track_total_hits: true,
            size: 0,
          },
        })
      ).hits.total.value;

      const servicesCount = (
        await search({
          index: [
            indices['apm_oss.transactionIndices'],
            indices['apm_oss.errorIndices'],
            indices['apm_oss.metricsIndices'],
          ],
          body: {
            size: 0,
            query: {
              bool: {
                filter: [range1d],
              },
            },
            aggs: {
              service_name: {
                cardinality: {
                  field: SERVICE_NAME,
                },
              },
            },
          },
        })
      ).aggregations?.service_name.value;

      return {
        counts: {
          max_error_groups_per_service: {
            '1d': errorGroupsCount || 0,
          },
          max_transaction_groups_per_service: {
            '1d': transactionGroupsCount || 0,
          },
          traces: {
            '1d': tracesPerDayCount || 0,
          },
          services: {
            '1d': servicesCount || 0,
          },
        },
      };
    },
  },
  {
    name: 'integrations',
    executor: async ({ transportRequest }) => {
      const apmJobs = ['apm-*', '*-high_mean_response_time'];

      const response = (await transportRequest({
        method: 'get',
        path: `/_ml/anomaly_detectors/${apmJobs.join(',')}`,
      })) as { body?: { count: number } };

      return {
        integrations: {
          ml: {
            all_jobs_count: response.body?.count ?? 0,
          },
        },
      };
    },
  },
  {
    name: 'agents',
    executor: async ({ search, indices }) => {
      const size = 3;

      const agentData = await AGENT_NAMES.reduce(async (prevJob, agentName) => {
        const data = await prevJob;

        const response = await search({
          index: [
            indices['apm_oss.errorIndices'],
            indices['apm_oss.metricsIndices'],
            indices['apm_oss.transactionIndices'],
          ],
          body: {
            size: 0,
            query: {
              bool: {
                filter: [
                  { term: { [AGENT_NAME]: agentName } },
                  { range: { '@timestamp': { gte: 'now-1d' } } },
                ],
              },
            },
            sort: {
              '@timestamp': 'desc',
            },
            aggs: {
              [AGENT_VERSION]: {
                terms: {
                  field: AGENT_VERSION,
                  size,
                },
              },
              [SERVICE_FRAMEWORK_NAME]: {
                terms: {
                  field: SERVICE_FRAMEWORK_NAME,
                  size,
                },
                aggs: {
                  [SERVICE_FRAMEWORK_VERSION]: {
                    terms: {
                      field: SERVICE_FRAMEWORK_VERSION,
                      size,
                    },
                  },
                },
              },
              [SERVICE_FRAMEWORK_VERSION]: {
                terms: {
                  field: SERVICE_FRAMEWORK_VERSION,
                  size,
                },
              },
              [SERVICE_LANGUAGE_NAME]: {
                terms: {
                  field: SERVICE_LANGUAGE_NAME,
                  size,
                },
                aggs: {
                  [SERVICE_LANGUAGE_VERSION]: {
                    terms: {
                      field: SERVICE_LANGUAGE_VERSION,
                      size,
                    },
                  },
                },
              },
              [SERVICE_LANGUAGE_VERSION]: {
                terms: {
                  field: SERVICE_LANGUAGE_VERSION,
                  size,
                },
              },
              [SERVICE_RUNTIME_NAME]: {
                terms: {
                  field: SERVICE_RUNTIME_NAME,
                  size,
                },
                aggs: {
                  [SERVICE_RUNTIME_VERSION]: {
                    terms: {
                      field: SERVICE_RUNTIME_VERSION,
                      size,
                    },
                  },
                },
              },
              [SERVICE_RUNTIME_VERSION]: {
                terms: {
                  field: SERVICE_RUNTIME_VERSION,
                  size,
                },
              },
            },
          },
        });

        const { aggregations } = response;

        if (!aggregations) {
          return data;
        }

        const toComposite = (
          outerKey: string | number,
          innerKey: string | number
        ) => `${outerKey}/${innerKey}`;

        return {
          ...data,
          [agentName]: {
            agent: {
              version: aggregations[AGENT_VERSION].buckets.map(
                (bucket) => bucket.key as string
              ),
            },
            service: {
              framework: {
                name: aggregations[SERVICE_FRAMEWORK_NAME].buckets
                  .map((bucket) => bucket.key as string)
                  .slice(0, size),
                version: aggregations[SERVICE_FRAMEWORK_VERSION].buckets
                  .map((bucket) => bucket.key as string)
                  .slice(0, size),
                composite: sortBy(
                  flatten(
                    aggregations[SERVICE_FRAMEWORK_NAME].buckets.map((bucket) =>
                      bucket[SERVICE_FRAMEWORK_VERSION].buckets.map(
                        (versionBucket) => ({
                          doc_count: versionBucket.doc_count,
                          name: toComposite(bucket.key, versionBucket.key),
                        })
                      )
                    )
                  ),
                  'doc_count'
                )
                  .reverse()
                  .slice(0, size)
                  .map((composite) => composite.name),
              },
              language: {
                name: aggregations[SERVICE_LANGUAGE_NAME].buckets
                  .map((bucket) => bucket.key as string)
                  .slice(0, size),
                version: aggregations[SERVICE_LANGUAGE_VERSION].buckets
                  .map((bucket) => bucket.key as string)
                  .slice(0, size),
                composite: sortBy(
                  flatten(
                    aggregations[SERVICE_LANGUAGE_NAME].buckets.map((bucket) =>
                      bucket[SERVICE_LANGUAGE_VERSION].buckets.map(
                        (versionBucket) => ({
                          doc_count: versionBucket.doc_count,
                          name: toComposite(bucket.key, versionBucket.key),
                        })
                      )
                    )
                  ),
                  'doc_count'
                )
                  .reverse()
                  .slice(0, size)
                  .map((composite) => composite.name),
              },
              runtime: {
                name: aggregations[SERVICE_RUNTIME_NAME].buckets
                  .map((bucket) => bucket.key as string)
                  .slice(0, size),
                version: aggregations[SERVICE_RUNTIME_VERSION].buckets
                  .map((bucket) => bucket.key as string)
                  .slice(0, size),
                composite: sortBy(
                  flatten(
                    aggregations[SERVICE_RUNTIME_NAME].buckets.map((bucket) =>
                      bucket[SERVICE_RUNTIME_VERSION].buckets.map(
                        (versionBucket) => ({
                          doc_count: versionBucket.doc_count,
                          name: toComposite(bucket.key, versionBucket.key),
                        })
                      )
                    )
                  ),
                  'doc_count'
                )
                  .reverse()
                  .slice(0, size)
                  .map((composite) => composite.name),
              },
            },
          },
        };
      }, Promise.resolve({} as APMTelemetry['agents']));

      return {
        agents: agentData,
      };
    },
  },
  {
    name: 'indices_stats',
    executor: async ({ indicesStats, indices }) => {
      const response = await indicesStats({
        index: [
          indices.apmAgentConfigurationIndex,
          indices['apm_oss.errorIndices'],
          indices['apm_oss.metricsIndices'],
          indices['apm_oss.onboardingIndices'],
          indices['apm_oss.sourcemapIndices'],
          indices['apm_oss.spanIndices'],
          indices['apm_oss.transactionIndices'],
        ],
      });

      return {
        indices: {
          shards: {
            total: response._shards.total,
          },
          all: {
            total: {
              docs: {
                count: response._all.total.docs.count,
              },
              store: {
                size_in_bytes: response._all.total.store.size_in_bytes,
              },
            },
          },
        },
      };
    },
  },
  {
    name: 'cardinality',
    executor: async ({ search }) => {
      const allAgentsCardinalityResponse = await search({
        body: {
          size: 0,
          query: {
            bool: {
              filter: [{ range: { '@timestamp': { gte: 'now-1d' } } }],
            },
          },
          aggs: {
            [TRANSACTION_NAME]: {
              cardinality: {
                field: TRANSACTION_NAME,
              },
            },
            [USER_AGENT_ORIGINAL]: {
              cardinality: {
                field: USER_AGENT_ORIGINAL,
              },
            },
          },
        },
      });

      const rumAgentCardinalityResponse = await search({
        body: {
          size: 0,
          query: {
            bool: {
              filter: [
                { range: { '@timestamp': { gte: 'now-1d' } } },
                { terms: { [AGENT_NAME]: ['rum-js', 'js-base'] } },
              ],
            },
          },
          aggs: {
            [TRANSACTION_NAME]: {
              cardinality: {
                field: TRANSACTION_NAME,
              },
            },
            [USER_AGENT_ORIGINAL]: {
              cardinality: {
                field: USER_AGENT_ORIGINAL,
              },
            },
          },
        },
      });

      return {
        cardinality: {
          transaction: {
            name: {
              all_agents: {
                '1d':
                  allAgentsCardinalityResponse.aggregations?.[TRANSACTION_NAME]
                    .value,
              },
              rum: {
                '1d':
                  rumAgentCardinalityResponse.aggregations?.[TRANSACTION_NAME]
                    .value,
              },
            },
          },
          user_agent: {
            original: {
              all_agents: {
                '1d':
                  allAgentsCardinalityResponse.aggregations?.[
                    USER_AGENT_ORIGINAL
                  ].value,
              },
              rum: {
                '1d':
                  rumAgentCardinalityResponse.aggregations?.[
                    USER_AGENT_ORIGINAL
                  ].value,
              },
            },
          },
        },
      };
    },
  },
];
