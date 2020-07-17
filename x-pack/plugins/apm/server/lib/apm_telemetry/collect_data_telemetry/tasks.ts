/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { flatten, merge, sortBy, sum } from 'lodash';
import { TelemetryTask } from '.';
import { AGENT_NAMES, RUM_AGENTS } from '../../../../common/agent_name';
import {
  AGENT_NAME,
  AGENT_VERSION,
  CLIENT_GEO_COUNTRY_ISO_CODE,
  CLOUD_AVAILABILITY_ZONE,
  CLOUD_PROVIDER,
  CLOUD_REGION,
  CONTAINER_ID,
  ERROR_GROUP_ID,
  HOST_NAME,
  OBSERVER_NAME,
  PARENT_ID,
  POD_NAME,
  PROCESSOR_EVENT,
  SERVICE_ENVIRONMENT,
  SERVICE_FRAMEWORK_NAME,
  SERVICE_FRAMEWORK_VERSION,
  SERVICE_LANGUAGE_NAME,
  SERVICE_LANGUAGE_VERSION,
  SERVICE_NAME,
  SERVICE_RUNTIME_NAME,
  SERVICE_RUNTIME_VERSION,
  SERVICE_VERSION,
  TRANSACTION_NAME,
  TRANSACTION_RESULT,
  TRANSACTION_TYPE,
  USER_AGENT_NAME,
  USER_AGENT_ORIGINAL,
} from '../../../../common/elasticsearch_fieldnames';
import { ESFilter } from '../../../../typings/elasticsearch';
import { APMError } from '../../../../typings/es_schemas/ui/apm_error';
import { AgentName } from '../../../../typings/es_schemas/ui/fields/agent';
import { Span } from '../../../../typings/es_schemas/ui/span';
import { Transaction } from '../../../../typings/es_schemas/ui/transaction';
import { APMTelemetry } from '../types';

const TIME_RANGES = ['1d', 'all'] as const;
type TimeRange = typeof TIME_RANGES[number];

const range1d = { range: { '@timestamp': { gte: 'now-1d' } } };
const timeout = '5m';

export const tasks: TelemetryTask[] = [
  {
    name: 'aggregated_transactions',
    // Record the number of metric documents we can expect in different scenarios. We simulate this by requesting data for 1m,
    // adding a composite aggregation on a number of fields and counting the number of buckets. The resulting count is an
    // approximation of the amount of metric documents that will be created. We record both the expected metric document count plus
    // the transaction count for that time range.
    executor: async ({ indices, search }) => {
      async function getBucketCountFromPaginatedQuery(
        key: string,
        filter: ESFilter[],
        count: number = 0,
        after?: any
      ) {
        const params = {
          index: [indices['apm_oss.transactionIndices']],
          body: {
            size: 0,
            timeout,
            query: { bool: { filter } },
            aggs: {
              [key]: {
                composite: {
                  ...(after ? { after } : {}),
                  size: 10000,
                  sources: fieldMap[key].map((field) => ({
                    [field]: { terms: { field, missing_bucket: true } },
                  })),
                },
              },
            },
          },
        };
        const result = await search(params);
        let nextAfter: any;

        if (result.aggregations) {
          nextAfter = result.aggregations[key].after_key;
          count += result.aggregations[key].buckets.length;
        }

        if (nextAfter) {
          count = await getBucketCountFromPaginatedQuery(
            key,
            filter,
            count,
            nextAfter
          );
        }

        return count;
      }

      async function totalSearch(filter: ESFilter[]) {
        const result = await search({
          index: [indices['apm_oss.transactionIndices']],
          body: {
            size: 0,
            timeout,
            query: { bool: { filter } },
            track_total_hits: true,
          },
        });

        return result.hits.total.value;
      }

      const nonRumAgentNames = AGENT_NAMES.filter(
        (name) => !RUM_AGENTS.includes(name)
      );

      const filter: ESFilter[] = [
        { term: { [PROCESSOR_EVENT]: 'transaction' } },
        { range: { '@timestamp': { gte: 'now-1m' } } },
      ];
      const noRumFilter = [
        ...filter,
        { terms: { [AGENT_NAME]: nonRumAgentNames } },
      ];
      const rumFilter = [...filter, { terms: { [AGENT_NAME]: RUM_AGENTS } }];

      const baseFields = [
        TRANSACTION_NAME,
        TRANSACTION_RESULT,
        TRANSACTION_TYPE,
        AGENT_NAME,
        SERVICE_ENVIRONMENT,
        SERVICE_VERSION,
        HOST_NAME,
        CONTAINER_ID,
        POD_NAME,
      ];

      const fieldMap: Record<string, string[]> = {
        current_implementation: [OBSERVER_NAME, ...baseFields, USER_AGENT_NAME],
        no_observer_name: [...baseFields, USER_AGENT_NAME],
        no_rum: [OBSERVER_NAME, ...baseFields],
        no_rum_no_observer_name: baseFields,
        only_rum: [OBSERVER_NAME, ...baseFields, USER_AGENT_NAME],
        only_rum_no_observer_name: [...baseFields, USER_AGENT_NAME],
      };

      // It would be more performant to do these in parallel, but we have different filters and keys and it's easier to
      // understand if we make the code slower and longer
      const countMap: Record<string, number> = {
        current_implementation: await getBucketCountFromPaginatedQuery(
          'current_implementation',
          filter
        ),
        no_observer_name: await getBucketCountFromPaginatedQuery(
          'no_observer_name',
          filter
        ),
        no_rum: await getBucketCountFromPaginatedQuery('no_rum', noRumFilter),
        no_rum_no_observer_name: await getBucketCountFromPaginatedQuery(
          'no_rum_no_observer_name',
          noRumFilter
        ),
        only_rum: await getBucketCountFromPaginatedQuery('only_rum', rumFilter),
        only_rum_no_observer_name: await getBucketCountFromPaginatedQuery(
          'only_rum_no_observer_name',
          rumFilter
        ),
      };

      const [allCount, noRumCount, rumCount] = await Promise.all([
        totalSearch(filter),
        totalSearch(noRumFilter),
        totalSearch(rumFilter),
      ]);

      return {
        aggregated_transactions: {
          current_implementation: {
            transaction_count: allCount,
            expected_metric_document_count: countMap.current_implementation,
          },
          no_observer_name: {
            transaction_count: allCount,
            expected_metric_document_count: countMap.no_observer_name,
          },
          no_rum: {
            transaction_count: noRumCount,
            expected_metric_document_count: countMap.no_rum,
          },
          no_rum_no_observer_name: {
            transaction_count: noRumCount,
            expected_metric_document_count: countMap.no_rum_no_observer_name,
          },
          only_rum: {
            transaction_count: rumCount,
            expected_metric_document_count: countMap.only_rum,
          },
          only_rum_no_observer_name: {
            transaction_count: rumCount,
            expected_metric_document_count: countMap.only_rum_no_observer_name,
          },
        },
      };
    },
  },
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
          timeout,
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

      interface Job {
        processorEvent: ProcessorEvent;
        timeRange: TimeRange;
      }

      const events = Object.keys(indicesByProcessorEvent) as ProcessorEvent[];
      const jobs: Job[] = events.flatMap((processorEvent) =>
        TIME_RANGES.map((timeRange) => ({ processorEvent, timeRange }))
      );

      const allData = await jobs.reduce((prevJob, current) => {
        return prevJob.then(async (data) => {
          const { processorEvent, timeRange } = current;

          const totalHitsResponse = await search({
            index: indicesByProcessorEvent[processorEvent],
            body: {
              size: 0,
              timeout,
              query: {
                bool: {
                  filter: [
                    { term: { [PROCESSOR_EVENT]: processorEvent } },
                    ...(timeRange === '1d' ? [range1d] : []),
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
                    timeout,
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
            timeout,
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
                timeout,
                query: {
                  bool: {
                    filter: [
                      {
                        term: {
                          [AGENT_NAME]: agentName,
                        },
                      },
                      range1d,
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
          timeout,
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
      const errorGroupsCount = (
        await search({
          index: indices['apm_oss.errorIndices'],
          body: {
            size: 0,
            timeout,
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
            timeout,
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
            timeout,
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
            timeout,
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
            timeout,
            query: {
              bool: {
                filter: [{ term: { [AGENT_NAME]: agentName } }, range1d],
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
            total: response._shards?.total ?? 0,
          },
          all: {
            total: {
              docs: {
                count: response._all?.total?.docs?.count ?? 0,
              },
              store: {
                size_in_bytes: response._all?.total?.store?.size_in_bytes ?? 0,
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
          timeout,
          query: {
            bool: {
              filter: [range1d],
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
          timeout,
          query: {
            bool: {
              filter: [range1d, { terms: { [AGENT_NAME]: RUM_AGENTS } }],
            },
          },
          aggs: {
            [CLIENT_GEO_COUNTRY_ISO_CODE]: {
              cardinality: { field: CLIENT_GEO_COUNTRY_ISO_CODE },
            },
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
          client: {
            geo: {
              country_iso_code: {
                rum: {
                  '1d':
                    rumAgentCardinalityResponse.aggregations?.[
                      CLIENT_GEO_COUNTRY_ISO_CODE
                    ].value,
                },
              },
            },
          },
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
