/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreSetup } from '@kbn/core/server';
import { lastValueFrom } from 'rxjs';
import { EsqlQueryTemplate } from '@kbn/data-definition-registry-plugin/server';
import { APMIndices } from '@kbn/apm-data-access-plugin/server';
import { castArray } from 'lodash';
import {
  MsearchMultisearchBody,
  MsearchMultisearchHeader,
  QueryDslQueryContainer,
} from '@elastic/elasticsearch/lib/api/types';
import { APMPluginSetupDependencies, APMPluginStartDependencies } from '../types';
import { ApmDocumentType } from '../../common/document_type';
import {
  AGENT_NAME,
  EVENT_OUTCOME,
  EVENT_SUCCESS_COUNT,
  METRICSET_NAME,
  SERVICE_ENVIRONMENT,
  SPAN_DESTINATION_SERVICE_RESOURCE,
  SPAN_DESTINATION_SERVICE_RESPONSE_TIME_COUNT,
  SPAN_DESTINATION_SERVICE_RESPONSE_TIME_SUM,
  SPAN_DURATION,
  TRANSACTION_DURATION,
  TRANSACTION_DURATION_HISTOGRAM,
  TRANSACTION_DURATION_SUMMARY,
  TRANSACTION_NAME,
} from '../../common/es_fields/apm';
import { getElasticJavaMetricQueries } from './agent_metrics/java';

interface ApmDataAvailability {
  hasServiceSummaryMetrics: boolean;
  hasServiceTransactionMetrics: boolean;
  hasTransactionMetrics: boolean;
  hasExitSpanMetrics: boolean;
  hasTraceEvents: boolean;
  hasErrorEvents: boolean;
}

const AGENT_METRICS = {
  'elastic/java': {
    term: {
      [AGENT_NAME]: 'java',
    },
  },
  'otel/java': {
    terms: {
      [AGENT_NAME]: ['opentelemetry/java', 'otlp/java'],
    },
  },
} satisfies Record<string, QueryDslQueryContainer>;

export function registerDataDefinitions({
  coreSetup,
  plugins,
}: {
  coreSetup: CoreSetup<APMPluginStartDependencies>;
  plugins: APMPluginSetupDependencies;
}) {
  plugins.dataDefinitionRegistry?.registerStaticDataDefinition({
    id: 'apm_data_definition',
    getQueries: async ({ dataStreams$, esClient, soClient, query, index }) => {
      const apmIndices = await plugins.apmDataAccess.getApmIndices(soClient);

      const queriesForAgentMetrics = Object.entries(AGENT_METRICS).map(([name, queryForAgent]) => {
        return {
          name,
          query: {
            bool: {
              filter: [
                queryForAgent,
                {
                  term: {
                    [METRICSET_NAME]: 'app',
                  },
                },
                {
                  terms: {
                    _index: castArray(apmIndices.metric),
                  },
                },
              ],
            },
          },
        };
      });

      const [dataStreams, hasDataForAgentMetrics] = await Promise.all([
        lastValueFrom(dataStreams$),
        esClient.asCurrentUser
          .msearch({
            searches: queriesForAgentMetrics.flatMap(({ name, query: queryForAgent }) => {
              return [
                {
                  index,
                } as MsearchMultisearchHeader,
                {
                  query: {
                    bool: {
                      filter: [query, queryForAgent],
                    },
                  },
                  timeout: '1ms',
                  track_total_hits: false,
                  terminate_after: 1,
                } as MsearchMultisearchBody,
              ];
            }),
          })
          .then(({ responses }) => {
            return Object.fromEntries(
              responses.map((response, idx) => {
                const agent = queriesForAgentMetrics[idx]?.name;
                return [
                  agent,
                  {
                    has_data:
                      'hits' in response && 'total' in response.hits
                        ? Boolean(
                            typeof response.hits.total === 'number'
                              ? response.hits.total
                              : response.hits.total?.value
                          )
                        : false,
                  },
                ];
              })
            ) as Record<keyof typeof AGENT_METRICS, { has_data: boolean }>;
          }),
      ]);

      const allApmIndices = Object.values(apmIndices);

      const hasAnyApmData = dataStreams.matches(allApmIndices);

      if (!hasAnyApmData) {
        return [];
      }

      const traceIndices = [...apmIndices.transaction, ...apmIndices.span];

      const hasMetricIndices = dataStreams.matches(apmIndices.metric);

      const availability: ApmDataAvailability = {
        hasServiceSummaryMetrics:
          hasMetricIndices && dataStreams.matches(`*.service_summary.1m`, { includeRemote: true }),
        hasServiceTransactionMetrics:
          hasMetricIndices &&
          dataStreams.matches(`*.service_transaction.1m`, { includeRemote: true }),
        hasTransactionMetrics:
          hasMetricIndices && dataStreams.matches(`*.transaction.1m`, { includeRemote: true }),
        hasExitSpanMetrics:
          hasMetricIndices &&
          dataStreams.matches(`*.service_destination.1m`, { includeRemote: true }),
        hasTraceEvents: dataStreams.matches(traceIndices),
        hasErrorEvents: dataStreams.matches(apmIndices.error),
      };

      const options: QueryFactoryOptions = { availability, indices: apmIndices };

      const queries: EsqlQueryTemplate[] = [
        ...getListServicesQuery(options),
        ...getTransactionQueries(options),
        ...(hasDataForAgentMetrics ? getElasticJavaMetricQueries() : []),
        ...getExitSpanQueries(options),
        // ...getListUpstreamDependenciesQuery(options),
        // ...getServiceNameForExitSpanQuery(options),
        // ...getExitSpanThroughputQuery(options),
        // ...getExitSpanLatencyQuery(options),
        // ...getExitSpanFailureRateQuery(options),
      ];

      return queries;
    },
  });
}

interface QueryFactoryOptions {
  availability: ApmDataAvailability;
  indices: APMIndices;
}

function getTransactionMetricSetName(type: ApmDocumentType) {
  if (type === ApmDocumentType.ServiceSummaryMetric) {
    return `service_summary`;
  }
  if (type === ApmDocumentType.ServiceTransactionMetric) {
    return `service_transaction`;
  }
  return `transaction`;
}

function getDocumentTypeForTransactions(availability: ApmDataAvailability) {
  // if (availability.hasServiceTransactionMetrics) {
  //   return ApmDocumentType.ServiceTransactionMetric;
  // }

  // if (availability.hasTransactionMetrics) {
  //   return ApmDocumentType.TransactionMetric;
  // }

  if (availability.hasTraceEvents) {
    return ApmDocumentType.TransactionEvent;
  }

  return undefined;
}

function getListServicesQuery({ availability, indices }: QueryFactoryOptions) {
  const description = 'List of services';

  const type = availability.hasServiceSummaryMetrics
    ? ApmDocumentType.ServiceSummaryMetric
    : getDocumentTypeForTransactions(availability);

  if (!type) {
    return [];
  }

  return [
    {
      description,
      query: `${getSourceCommandsForDocumentType({
        type,
        indices,
      })} | STATS service_names = VALUES(service.name)`,
    },
  ];
}

function getSourceCommands(index: string | string[]) {
  return `FROM ${castArray(index).join(',')}
  | WHERE @timestamp >= ?_tstart AND @timestamp <= ?_tend`;
}

function getSourceCommandsForDocumentType({
  type,
  indices,
}: {
  type: ApmDocumentType;
  indices: APMIndices;
}) {
  if (
    type === ApmDocumentType.ServiceSummaryMetric ||
    type === ApmDocumentType.ServiceTransactionMetric ||
    type === ApmDocumentType.TransactionMetric
  ) {
    return `${getSourceCommands(
      indices.metric
    )} | WHERE metricset.name == "${getTransactionMetricSetName(
      type
    )}" AND metricset.interval == "1m"`;
  }

  if (type === ApmDocumentType.ServiceDestinationMetric) {
    return `${getSourceCommands(
      indices.metric
    )} | WHERE metricset.name == "service_destination" AND metricset.interval == "1m"`;
  }

  if (type === ApmDocumentType.TransactionEvent) {
    return `${getSourceCommands(indices.transaction)} | WHERE processor.event == "transaction"`;
  }

  if (type === ApmDocumentType.SpanEvent) {
    return `${getSourceCommands(indices.span)} | WHERE processor.event == "span"`;
  }

  return `${getSourceCommands(indices.error)} | WHERE processor.event == "error"`;
}

function getTransactionQueries({ availability, indices }: QueryFactoryOptions) {
  const type = getDocumentTypeForTransactions(availability);

  if (!type) {
    return [];
  }

  const baseQuery = getSourceCommandsForDocumentType({ type, indices });

  return [
    {
      query: getTransactionThroughputQuery(type),
      description: 'Throughput for a service',
    },
    {
      query: getTransactionLatencyAvgQuery(type),
      description: 'Average latency (ms) for a service',
    },
    {
      query: getTransactionLatencyPercentilesQuery(type),
      description: 'Latency (ms) for a service as a percentile',
    },
    {
      query: getTransactionFailureRateQuery(type),
      description: `Failure rate (%) for a service`,
    },
  ]
    .map(({ query, description }) => {
      return {
        query: `${baseQuery}
          | WHERE service.name == ?serviceName
          | ${query} BY service.environment, transaction.type`,
        description,
      };
    })
    .concat({
      query: getTransactionGroupsForServiceQuery({
        type:
          type === ApmDocumentType.TransactionEvent
            ? ApmDocumentType.TransactionEvent
            : ApmDocumentType.TransactionMetric,
        indices,
      }),
      description: `List of transaction groups for a service`,
    });
}

function getTransactionThroughputQuery(type: ApmDocumentType) {
  if (
    type === ApmDocumentType.ServiceTransactionMetric ||
    type === ApmDocumentType.TransactionMetric
  ) {
    return `STATS total_throughput = SUM(${TRANSACTION_DURATION_SUMMARY})`;
  }

  return `STATS total_throughput = SUM(transaction.representative_count)`;
}

function getTransactionLatencyAvgQuery(type: ApmDocumentType) {
  if (
    type === ApmDocumentType.ServiceTransactionMetric ||
    type === ApmDocumentType.TransactionMetric
  ) {
    return `STATS avg_latency_ms = AVG(${TRANSACTION_DURATION_SUMMARY}) * 1000`;
  }

  return `STATS avg_latency_ms = WEIGHTED_AVG(${TRANSACTION_DURATION}, transaction.representative_count) * 1000`;
}

function getTransactionLatencyPercentilesQuery(type: ApmDocumentType) {
  if (type === ApmDocumentType.TransactionEvent) {
    return `STATS percentile_latency_ms = PERCENTILES(${TRANSACTION_DURATION}, ?percentile)`;
  }
  return `STATS percentile_latency_ms = PERCENTILES(${TRANSACTION_DURATION_HISTOGRAM}, ?percentile)`;
}

function getTransactionFailureRateQuery(type: ApmDocumentType) {
  if (type === ApmDocumentType.ServiceTransactionMetric) {
    return `STATS failure_rate = (COUNT(${EVENT_SUCCESS_COUNT}) / SUM(${EVENT_SUCCESS_COUNT})) * 100`;
  }

  return `EVAL is_failed = CASE(${EVENT_OUTCOME} == "failure", 0, ${EVENT_OUTCOME} == "success", 1, NULL) | STATS failure_rate = AVG(is_failed) * 100`;
}

function getTransactionGroupsForServiceQuery(options: {
  type: ApmDocumentType;
  indices: APMIndices;
}) {
  return `${getSourceCommandsForDocumentType(options)}
    | WHERE service.name == ?serviceName
    | STATS transaction_groups = VALUES(${TRANSACTION_NAME})`;
}

function getDocumentTypeForExitSpans(availability: ApmDataAvailability) {
  if (availability.hasExitSpanMetrics) {
    return ApmDocumentType.ServiceDestinationMetric;
  }

  if (availability.hasTraceEvents) {
    return ApmDocumentType.SpanEvent;
  }
  return undefined;
}

function getExitSpanQueries({ availability, indices }: QueryFactoryOptions) {
  const type = getDocumentTypeForExitSpans(availability);

  if (!type) {
    return [];
  }

  const baseQuery = getSourceCommandsForDocumentType({ type, indices });

  return [
    {
      description: 'Total throughput from service to upstream dependency',
      query: getExitSpanThroughputQuery(type),
    },
    {
      description: 'Failure rate from service to upstream dependency',
      query: getExitSpanFailureRateQuery(type),
    },
    {
      description: `Average latency (ms) from service to upstream dependency`,
      query: getExitSpanAvgLatencyQuery(type),
    },
  ]
    .map(({ description, query }) => {
      return {
        description,
        query: `${baseQuery} | ${query} BY ${SPAN_DESTINATION_SERVICE_RESOURCE}, ${SERVICE_ENVIRONMENT}`,
      };
    })
    .concat({
      description: 'List upstream dependencies for service',
      query: `${baseQuery} | VALUES(${SPAN_DESTINATION_SERVICE_RESOURCE}) BY ${SERVICE_ENVIRONMENT}`,
    });
}

function getExitSpanThroughputQuery(type: ApmDocumentType) {
  const multiplierField =
    type === ApmDocumentType.ServiceDestinationMetric
      ? SPAN_DESTINATION_SERVICE_RESPONSE_TIME_COUNT
      : 'span.representative_count';

  return `STATS total_throughput = SUM(${multiplierField})`;
}

function getExitSpanFailureRateQuery(type: ApmDocumentType) {
  const multiplierField =
    type === ApmDocumentType.ServiceDestinationMetric
      ? SPAN_DESTINATION_SERVICE_RESPONSE_TIME_COUNT
      : 'span.representative_count';

  return `STATS failure_rate =
      SUM(CASE(${EVENT_OUTCOME} == "failure", ${multiplierField}, NULL))
      / SUM(CASE(${EVENT_OUTCOME} IN ("failure", "success"), ${multiplierField}, NULL))`;
}

function getExitSpanAvgLatencyQuery(type: ApmDocumentType) {
  if (type === ApmDocumentType.ServiceDestinationMetric) {
    return `STATS avg_latency_ms = SUM(${SPAN_DESTINATION_SERVICE_RESPONSE_TIME_SUM}) / SUM(${SPAN_DESTINATION_SERVICE_RESPONSE_TIME_COUNT}) * 1000`;
  }

  return `STATS avg_latency_ms = WEIGHTED_AVG(${SPAN_DURATION}, span.representative_count) * 1000`;
}
