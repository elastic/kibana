/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { fromKueryExpression } from '@kbn/es-query';
import { ProcessorEvent } from '@kbn/observability-plugin/common';
import { createHash } from 'crypto';
import { flatten, merge, pickBy, sortBy, sum, uniq } from 'lodash';
import { SavedObjectsClient } from '@kbn/core/server';
import { AGENT_NAMES, RUM_AGENT_NAMES } from '../../../../common/agent_name';
import {
  AGENT_ACTIVATION_METHOD,
  AGENT_NAME,
  AGENT_VERSION,
  CLIENT_GEO_COUNTRY_ISO_CODE,
  CLOUD_AVAILABILITY_ZONE,
  CLOUD_PROVIDER,
  CLOUD_REGION,
  CONTAINER_ID,
  ERROR_GROUP_ID,
  FAAS_TRIGGER_TYPE,
  HOST_NAME,
  HOST_OS_PLATFORM,
  KUBERNETES_POD_NAME,
  OBSERVER_HOSTNAME,
  PARENT_ID,
  PROCESSOR_EVENT,
  SERVICE_ENVIRONMENT,
  SERVICE_FRAMEWORK_NAME,
  SERVICE_FRAMEWORK_VERSION,
  SERVICE_LANGUAGE_NAME,
  SERVICE_LANGUAGE_VERSION,
  SERVICE_NAME,
  SERVICE_NODE_NAME,
  SERVICE_RUNTIME_NAME,
  SERVICE_RUNTIME_VERSION,
  SERVICE_VERSION,
  TRANSACTION_NAME,
  TRANSACTION_RESULT,
  TRANSACTION_TYPE,
  USER_AGENT_ORIGINAL,
} from '../../../../common/es_fields/apm';
import {
  APM_SERVICE_GROUP_SAVED_OBJECT_TYPE,
  MAX_NUMBER_OF_SERVICE_GROUPS,
  SavedServiceGroup,
} from '../../../../common/service_groups';
import { asMutableArray } from '../../../../common/utils/as_mutable_array';
import { getKueryFields } from '../../../../common/utils/get_kuery_fields';
import { APMError } from '../../../../typings/es_schemas/ui/apm_error';
import { AgentName } from '../../../../typings/es_schemas/ui/fields/agent';
import { Span } from '../../../../typings/es_schemas/ui/span';
import { Transaction } from '../../../../typings/es_schemas/ui/transaction';
import { APMTelemetry, APMPerService, APMDataTelemetry } from '../types';
import {
  ApmIndicesConfig,
  APM_AGENT_CONFIGURATION_INDEX,
} from '../../../routes/settings/apm_indices/get_apm_indices';
import { TelemetryClient } from '../telemetry_client';

type ISavedObjectsClient = Pick<SavedObjectsClient, 'find'>;
const TIME_RANGES = ['1d', 'all'] as const;
type TimeRange = typeof TIME_RANGES[number];

const range1d = { range: { '@timestamp': { gte: 'now-1d' } } };
const timeout = '5m';

interface TelemetryTask {
  name: string;
  executor: (params: TelemetryTaskExecutorParams) => Promise<APMDataTelemetry>;
}

export interface TelemetryTaskExecutorParams {
  telemetryClient: TelemetryClient;
  indices: ApmIndicesConfig;
  savedObjectsClient: ISavedObjectsClient;
}

export const tasks: TelemetryTask[] = [
  {
    name: 'aggregated_transactions',
    // Record the number of metric documents we can expect in different scenarios. We simulate this by requesting data for 1m,
    // adding a composite aggregation on a number of fields and counting the number of buckets. The resulting count is an
    // approximation of the amount of metric documents that will be created. We record both the expected metric document count plus
    // the transaction count for that time range.
    executor: async ({ indices, telemetryClient }) => {
      async function getBucketCountFromPaginatedQuery(
        sources: estypes.AggregationsCompositeAggregationSource[],
        prevResult?: {
          transaction_count: number;
          expected_metric_document_count: number;
        },
        after?: any
      ): Promise<{
        transaction_count: number;
        expected_metric_document_count: number;
        ratio: number;
      }> {
        // eslint-disable-next-line @typescript-eslint/naming-convention
        let { expected_metric_document_count } = prevResult ?? {
          transaction_count: 0,
          expected_metric_document_count: 0,
        };

        const params = {
          index: [indices.transaction],
          body: {
            track_total_hits: true,
            size: 0,
            timeout,
            query: {
              bool: {
                filter: [
                  { term: { [PROCESSOR_EVENT]: ProcessorEvent.transaction } },
                  { range: { '@timestamp': { gte: start, lt: end } } },
                ],
              },
            },
            aggs: {
              transaction_metric_groups: {
                composite: {
                  ...(after ? { after } : {}),
                  size: 10000,
                  sources: sources.map((source, index) => {
                    return {
                      [index]: source,
                    };
                  }),
                },
              },
            },
          },
        };

        const result = await telemetryClient.search(params);

        let nextAfter: any;

        if (result.aggregations) {
          nextAfter = result.aggregations.transaction_metric_groups.after_key;
          expected_metric_document_count +=
            result.aggregations.transaction_metric_groups.buckets.length;
        }

        const transactionCount = result.hits.total.value;

        if (nextAfter) {
          return await getBucketCountFromPaginatedQuery(
            sources,
            {
              expected_metric_document_count,
              transaction_count: transactionCount,
            },
            nextAfter
          );
        }

        return {
          expected_metric_document_count,
          transaction_count: transactionCount,
          ratio: expected_metric_document_count / transactionCount,
        };
      }

      // fixed date range for reliable results
      const lastTransaction = (
        await telemetryClient.search({
          index: indices.transaction,
          body: {
            timeout,
            query: {
              bool: {
                filter: [
                  { term: { [PROCESSOR_EVENT]: ProcessorEvent.transaction } },
                ],
              },
            },
            size: 1,
            track_total_hits: false,
            sort: {
              '@timestamp': 'desc' as const,
            },
          },
        })
      ).hits.hits[0] as { _source: { '@timestamp': string } };

      if (!lastTransaction) {
        return {};
      }

      const end =
        new Date(lastTransaction._source['@timestamp']).getTime() -
        5 * 60 * 1000;

      const start = end - 60 * 1000;

      const simpleTermFields = [
        TRANSACTION_NAME,
        TRANSACTION_RESULT,
        TRANSACTION_TYPE,
        AGENT_NAME,
        SERVICE_ENVIRONMENT,
        SERVICE_VERSION,
        HOST_NAME,
        CONTAINER_ID,
        KUBERNETES_POD_NAME,
      ].map((field) => ({ terms: { field, missing_bucket: true } }));

      const observerHostname = {
        terms: { field: OBSERVER_HOSTNAME, missing_bucket: true },
      };

      const baseFields = [
        ...simpleTermFields,
        // user_agent.name only for page-load transactions
        {
          terms: {
            script: `
              if (doc['transaction.type'].value == 'page-load' && doc['user_agent.name'].size() > 0) {
                return doc['user_agent.name'].value;
              }

              return null;
            `,
            missing_bucket: true,
          },
        },
        // transaction.root
        {
          terms: {
            script: `return doc['parent.id'].size() == 0`,
            missing_bucket: true,
          },
        },
      ];

      const results = {
        current_implementation: await getBucketCountFromPaginatedQuery([
          ...baseFields,
          observerHostname,
        ]),
        with_country: await getBucketCountFromPaginatedQuery([
          ...baseFields,
          observerHostname,
          {
            terms: {
              script: `
                if (doc['transaction.type'].value == 'page-load' && doc['client.geo.country_iso_code'].size() > 0) {
                  return doc['client.geo.country_iso_code'].value;
                }
                return null;
              `,
              missing_bucket: true,
            },
          },
        ]),
        no_observer_name: await getBucketCountFromPaginatedQuery(baseFields),
      };

      return {
        aggregated_transactions: results,
      };
    },
  },
  {
    name: 'cloud',
    executor: async ({ indices, telemetryClient }) => {
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

      const response = await telemetryClient.search({
        index: [
          indices.error,
          indices.metric,
          indices.span,
          indices.transaction,
        ],
        body: {
          track_total_hits: false,
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
    name: 'host',
    executor: async ({ indices, telemetryClient }) => {
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

      const response = await telemetryClient.search({
        index: [
          indices.error,
          indices.metric,
          indices.span,
          indices.transaction,
        ],
        body: {
          track_total_hits: false,
          size: 0,
          timeout,
          aggs: {
            platform: {
              terms: {
                field: HOST_OS_PLATFORM,
              },
            },
          },
        },
      });

      const { aggregations } = response;

      if (!aggregations) {
        return { host: { os: { platform: [] } } };
      }
      const host = {
        os: {
          platform: getBucketKeys(aggregations.platform),
        },
      };
      return { host };
    },
  },
  {
    name: 'environments',
    executor: async ({ indices, telemetryClient }) => {
      const response = await telemetryClient.search({
        index: [indices.transaction],
        body: {
          track_total_hits: false,
          size: 0,
          timeout,
          query: {
            bool: {
              filter: [range1d],
            },
          },
          aggs: {
            environments: {
              terms: {
                field: SERVICE_ENVIRONMENT,
                size: 5,
              },
            },
            service_environments: {
              composite: {
                size: 1000,
                sources: asMutableArray([
                  {
                    [SERVICE_ENVIRONMENT]: {
                      terms: {
                        field: SERVICE_ENVIRONMENT,
                        missing_bucket: true,
                      },
                    },
                  },
                  {
                    [SERVICE_NAME]: {
                      terms: {
                        field: SERVICE_NAME,
                      },
                    },
                  },
                ] as const),
              },
            },
          },
        },
      });

      const topEnvironments =
        response.aggregations?.environments.buckets.map(
          (bucket) => bucket.key
        ) ?? [];
      const serviceEnvironments: Record<string, Array<string | null>> = {};

      const buckets = response.aggregations?.service_environments.buckets ?? [];

      buckets.forEach((bucket) => {
        const serviceName = bucket.key['service.name'];
        const environment = bucket.key['service.environment'] as string | null;

        const environments = serviceEnvironments[serviceName] ?? [];

        serviceEnvironments[serviceName] = environments.concat(environment);
      });

      const servicesWithoutEnvironment = Object.keys(
        pickBy(serviceEnvironments, (environments) =>
          environments.includes(null)
        )
      );

      const servicesWithMultipleEnvironments = Object.keys(
        pickBy(serviceEnvironments, (environments) => environments.length > 1)
      );

      return {
        environments: {
          services_without_environment: servicesWithoutEnvironment.length,
          services_with_multiple_environments:
            servicesWithMultipleEnvironments.length,
          top_environments: topEnvironments as string[],
        },
      };
    },
  },
  {
    name: 'processor_events',
    executor: async ({ indices, telemetryClient }) => {
      const indicesByProcessorEvent = {
        error: indices.error,
        metric: indices.metric,
        span: indices.span,
        transaction: indices.transaction,
        onboarding: indices.onboarding,
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

          const totalHitsResponse = await telemetryClient.search({
            index: indicesByProcessorEvent[processorEvent],
            body: {
              size: 0,
              track_total_hits: true,
              timeout,
              query: {
                bool: {
                  filter: [
                    { term: { [PROCESSOR_EVENT]: processorEvent } },
                    ...(timeRange === '1d' ? [range1d] : []),
                  ],
                },
              },
            },
          });

          const retainmentResponse =
            timeRange === 'all'
              ? await telemetryClient.search({
                  index: indicesByProcessorEvent[processorEvent],
                  size: 10,
                  body: {
                    track_total_hits: false,
                    size: 0,
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
    executor: async ({ indices, telemetryClient }) => {
      const agentConfigurationCount = await telemetryClient.search({
        index: APM_AGENT_CONFIGURATION_INDEX,
        body: {
          size: 0,
          timeout,
          track_total_hits: true,
        },
      });

      return {
        counts: {
          agent_configuration: {
            all: agentConfigurationCount.hits.total.value,
          },
        },
      };
    },
  },
  {
    name: 'services',
    executor: async ({ indices, telemetryClient }) => {
      const servicesPerAgent = await AGENT_NAMES.reduce(
        (prevJob, agentName) => {
          return prevJob.then(async (data) => {
            const response = await telemetryClient.search({
              index: [
                indices.error,
                indices.span,
                indices.metric,
                indices.transaction,
              ],
              body: {
                size: 0,
                track_total_hits: false,
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
    executor: async ({ indices, telemetryClient }) => {
      const response = await telemetryClient.search({
        index: [indices.transaction, indices.span, indices.error],
        terminate_after: 1,
        body: {
          query: {
            exists: {
              field: 'observer.version',
            },
          },
          track_total_hits: false,
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
    executor: async ({ indices, telemetryClient }) => {
      const errorGroupsCount = (
        await telemetryClient.search({
          index: indices.error,
          body: {
            size: 0,
            timeout,
            track_total_hits: false,
            query: {
              bool: {
                filter: [
                  { term: { [PROCESSOR_EVENT]: ProcessorEvent.error } },
                  range1d,
                ],
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
        await telemetryClient.search({
          index: indices.transaction,
          body: {
            track_total_hits: false,
            size: 0,
            timeout,
            query: {
              bool: {
                filter: [
                  { term: { [PROCESSOR_EVENT]: ProcessorEvent.transaction } },
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
        await telemetryClient.search({
          index: indices.transaction,
          body: {
            query: {
              bool: {
                filter: [
                  { term: { [PROCESSOR_EVENT]: ProcessorEvent.transaction } },
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
        await telemetryClient.search({
          index: [indices.transaction, indices.error, indices.metric],
          body: {
            track_total_hits: false,
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
    executor: async ({ telemetryClient }) => {
      const apmJobs = ['apm-*', '*-high_mean_response_time'];

      const response = (await telemetryClient.transportRequest({
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
    executor: async ({ indices, telemetryClient }) => {
      const size = 3;

      const agentData = await AGENT_NAMES.reduce(async (prevJob, agentName) => {
        const data = await prevJob;

        const response = await telemetryClient.search({
          index: [indices.error, indices.metric, indices.transaction],
          body: {
            track_total_hits: false,
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
              [AGENT_ACTIVATION_METHOD]: {
                terms: {
                  field: AGENT_ACTIVATION_METHOD,
                  size,
                },
              },
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
              activation_method: aggregations[AGENT_ACTIVATION_METHOD].buckets
                .map((bucket) => bucket.key as string)
                .slice(0, size),
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
    executor: async ({ indices, telemetryClient }) => {
      const response = await telemetryClient.indicesStats({
        index: [
          APM_AGENT_CONFIGURATION_INDEX,
          indices.error,
          indices.metric,
          indices.onboarding,
          indices.span,
          indices.transaction,
        ],
      });

      const metricIndicesResponse = await telemetryClient.indicesStats({
        index: [indices.metric],
      });

      const tracesIndicesResponse = await telemetryClient.indicesStats({
        index: [indices.span, indices.transaction],
      });

      return {
        indices: {
          metric: {
            shards: {
              total: metricIndicesResponse._shards?.total ?? 0,
            },
            all: {
              total: {
                docs: {
                  count: metricIndicesResponse._all?.total?.docs?.count ?? 0,
                },
                store: {
                  size_in_bytes:
                    metricIndicesResponse._all?.total?.store?.size_in_bytes ??
                    0,
                },
              },
            },
          },
          traces: {
            shards: {
              total: tracesIndicesResponse._shards?.total ?? 0,
            },
            all: {
              total: {
                docs: {
                  count: tracesIndicesResponse._all?.total?.docs?.count ?? 0,
                },
                store: {
                  size_in_bytes:
                    tracesIndicesResponse._all?.total?.store?.size_in_bytes ??
                    0,
                },
              },
            },
          },
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
    executor: async ({ indices, telemetryClient }) => {
      const allAgentsCardinalityResponse = await telemetryClient.search({
        index: [indices.transaction],
        body: {
          track_total_hits: false,
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

      const rumAgentCardinalityResponse = await telemetryClient.search({
        index: [indices.transaction],
        body: {
          track_total_hits: false,
          size: 0,
          timeout,
          query: {
            bool: {
              filter: [range1d, { terms: { [AGENT_NAME]: RUM_AGENT_NAMES } }],
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
                  '1d': rumAgentCardinalityResponse.aggregations?.[
                    CLIENT_GEO_COUNTRY_ISO_CODE
                  ].value,
                },
              },
            },
          },
          transaction: {
            name: {
              all_agents: {
                '1d': allAgentsCardinalityResponse.aggregations?.[
                  TRANSACTION_NAME
                ].value,
              },
              rum: {
                '1d': rumAgentCardinalityResponse.aggregations?.[
                  TRANSACTION_NAME
                ].value,
              },
            },
          },
          user_agent: {
            original: {
              all_agents: {
                '1d': allAgentsCardinalityResponse.aggregations?.[
                  USER_AGENT_ORIGINAL
                ].value,
              },
              rum: {
                '1d': rumAgentCardinalityResponse.aggregations?.[
                  USER_AGENT_ORIGINAL
                ].value,
              },
            },
          },
        },
      };
    },
  },
  {
    name: 'service_groups',
    executor: async ({ savedObjectsClient }) => {
      const response = await savedObjectsClient.find<SavedServiceGroup>({
        type: APM_SERVICE_GROUP_SAVED_OBJECT_TYPE,
        page: 1,
        perPage: MAX_NUMBER_OF_SERVICE_GROUPS,
        sortField: 'updated_at',
        sortOrder: 'desc',
        namespaces: ['*'],
      });

      const kueryNodes = response.saved_objects.map(
        ({ attributes: { kuery } }) => fromKueryExpression(kuery)
      );

      const kueryFields = getKueryFields(kueryNodes);

      return {
        service_groups: {
          kuery_fields: uniq(kueryFields),
          total: response.total ?? 0,
        },
      };
    },
  },
  {
    name: 'per_service',
    executor: async ({ indices, telemetryClient }) => {
      const response = await telemetryClient.search({
        index: [indices.transaction],
        body: {
          track_total_hits: false,
          size: 0,
          timeout,
          query: {
            bool: {
              filter: [
                { range: { '@timestamp': { gte: 'now-1h' } } },
                { term: { [PROCESSOR_EVENT]: ProcessorEvent.transaction } },
              ],
            },
          },
          aggs: {
            service_names: {
              terms: {
                field: SERVICE_NAME,
                size: 2500,
              },
              aggs: {
                environments: {
                  terms: {
                    field: SERVICE_ENVIRONMENT,
                    size: 5,
                  },
                  aggs: {
                    instances: {
                      cardinality: {
                        field: SERVICE_NODE_NAME,
                      },
                    },
                    transaction_types: {
                      cardinality: {
                        field: TRANSACTION_TYPE,
                      },
                    },
                    top_metrics: {
                      top_metrics: {
                        sort: '_score',
                        metrics: [
                          {
                            field: AGENT_ACTIVATION_METHOD,
                          },
                          {
                            field: AGENT_NAME,
                          },
                          {
                            field: AGENT_VERSION,
                          },
                          {
                            field: SERVICE_LANGUAGE_NAME,
                          },
                          {
                            field: SERVICE_LANGUAGE_VERSION,
                          },
                          {
                            field: SERVICE_FRAMEWORK_NAME,
                          },
                          {
                            field: SERVICE_FRAMEWORK_VERSION,
                          },
                          {
                            field: SERVICE_RUNTIME_NAME,
                          },
                          {
                            field: SERVICE_RUNTIME_VERSION,
                          },
                          {
                            field: KUBERNETES_POD_NAME,
                          },
                          {
                            field: CONTAINER_ID,
                          },
                        ],
                      },
                    },
                    [CLOUD_REGION]: {
                      terms: {
                        field: CLOUD_REGION,
                        size: 5,
                      },
                    },
                    [CLOUD_PROVIDER]: {
                      terms: {
                        field: CLOUD_PROVIDER,
                        size: 3,
                      },
                    },
                    [CLOUD_AVAILABILITY_ZONE]: {
                      terms: {
                        field: CLOUD_AVAILABILITY_ZONE,
                        size: 5,
                      },
                    },
                    [FAAS_TRIGGER_TYPE]: {
                      terms: {
                        field: FAAS_TRIGGER_TYPE,
                        size: 5,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      });
      const serviceBuckets = response.aggregations?.service_names.buckets ?? [];
      const data: APMPerService[] = serviceBuckets.flatMap((serviceBucket) => {
        const envHash = createHash('sha256')
          .update(serviceBucket.key as string)
          .digest('hex');
        const envBuckets = serviceBucket.environments?.buckets ?? [];
        return envBuckets.map((envBucket) => {
          const nameHash = createHash('sha256')
            .update(envBucket.key as string)
            .digest('hex');
          const fullServiceName = `${nameHash}~${envHash}`;
          return {
            service_id: fullServiceName,
            timed_out: response.timed_out,
            num_service_nodes: envBucket.instances.value ?? 1,
            num_transaction_types: envBucket.transaction_types.value ?? 0,
            cloud: {
              availability_zones:
                envBucket[CLOUD_AVAILABILITY_ZONE]?.buckets.map(
                  (inner) => inner.key as string
                ) ?? [],
              regions:
                envBucket[CLOUD_REGION]?.buckets.map(
                  (inner) => inner.key as string
                ) ?? [],
              providers:
                envBucket[CLOUD_PROVIDER]?.buckets.map(
                  (inner) => inner.key as string
                ) ?? [],
            },
            faas: {
              trigger: {
                type:
                  envBucket[FAAS_TRIGGER_TYPE]?.buckets.map(
                    (inner) => inner.key as string
                  ) ?? [],
              },
            },
            agent: {
              name: envBucket.top_metrics?.top[0].metrics[AGENT_NAME] as string,
              activation_method: envBucket.top_metrics?.top[0].metrics[
                AGENT_ACTIVATION_METHOD
              ] as string,
              version: envBucket.top_metrics?.top[0].metrics[
                AGENT_VERSION
              ] as string,
            },
            service: {
              language: {
                name: envBucket.top_metrics?.top[0].metrics[
                  SERVICE_LANGUAGE_NAME
                ] as string,
                version: envBucket.top_metrics?.top[0].metrics[
                  SERVICE_LANGUAGE_VERSION
                ] as string,
              },
              framework: {
                name: envBucket.top_metrics?.top[0].metrics[
                  SERVICE_FRAMEWORK_NAME
                ] as string,
                version: envBucket.top_metrics?.top[0].metrics[
                  SERVICE_FRAMEWORK_VERSION
                ] as string,
              },
              runtime: {
                name: envBucket.top_metrics?.top[0].metrics[
                  SERVICE_RUNTIME_NAME
                ] as string,
                version: envBucket.top_metrics?.top[0].metrics[
                  SERVICE_RUNTIME_VERSION
                ] as string,
              },
            },
            kubernetes: {
              pod: {
                name: envBucket.top_metrics?.top[0].metrics[
                  KUBERNETES_POD_NAME
                ] as string,
              },
            },
            container: {
              id: envBucket.top_metrics?.top[0].metrics[CONTAINER_ID] as string,
            },
          };
        });
      });
      return {
        per_service: data,
      };
    },
  },
];
