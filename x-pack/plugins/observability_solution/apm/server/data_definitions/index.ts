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
import { APMPluginSetupDependencies, APMPluginStartDependencies } from '../types';
import { ApmDocumentType } from '../../common/document_type';

interface ApmDataAvailability {
  hasServiceSummaryMetrics: boolean;
  hasServiceTransactionMetrics: boolean;
  hasTransactionMetrics: boolean;
  hasExitSpanMetrics: boolean;
  hasTraceEvents: boolean;
  hasErrorEvents: boolean;
}

export function registerDataDefinitions({
  coreSetup,
  plugins,
}: {
  coreSetup: CoreSetup<APMPluginStartDependencies>;
  plugins: APMPluginSetupDependencies;
}) {
  plugins.dataDefinitionRegistry?.registerStaticDataDefinition({
    id: 'apm_data_definition',
    getQueries: async ({ dataStreams$, soClient }) => {
      const [apmIndices, dataStreams] = await Promise.all([
        plugins.apmDataAccess.getApmIndices(soClient),
        lastValueFrom(dataStreams$),
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
  if (availability.hasServiceTransactionMetrics) {
    return ApmDocumentType.ServiceTransactionMetric;
  }

  if (availability.hasTransactionMetrics) {
    return ApmDocumentType.TransactionMetric;
  }

  return ApmDocumentType.TransactionEvent;
}

function getListServicesQuery({ availability, indices }: QueryFactoryOptions) {
  const description = 'List of services';

  const type = availability.hasServiceSummaryMetrics
    ? ApmDocumentType.ServiceSummaryMetric
    : getDocumentTypeForTransactions(availability);
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
    )} | WHERE metricset.name == ${getTransactionMetricSetName(
      type
    )} AND metricset.interval == "1m"`;
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

  const baseQuery = getSourceCommandsForDocumentType({ type, indices });

  return [
    {
      query: getTransactionThroughputQuery(type),
      description: 'Throughput for a service',
    },
    {
      query: getTransactionLatencyAvgQuery(type),
      description: 'Average latency for a service',
    },
    {
      query: getTransactionLatencyPercentilesQuery(type),
      description: 'Latency for a service as a percentile',
    },
    {
      query: getTransactionFailureRateQuery(type),
      description: `Failure rate for a service as 0.00 - 1.00`,
    },
    {
      query: getTransactionGroupsForService(type),
      description: `List of transaction groups for a service`,
    },
  ].map(({ query, description }) => {
    return {
      query: `${baseQuery} | ${query} BY service.environment, transaction.type`,
      description,
    };
  });
}

function getTransactionThroughputQuery(type: ApmDocumentType) {
  if (
    type === ApmDocumentType.ServiceTransactionMetric ||
    type === ApmDocumentType.TransactionMetric
  ) {
    return `STATS total_throughput = SUM(transaction.duration.summary)`;
  }

  return `STATS total_throughput = SUM(transaction.duration.us) / SUM(transaction.representative_count)`;
}

function getTransactionLatencyAvgQuery(type: ApmDocumentType) {
  if (
    type === ApmDocumentType.ServiceTransactionMetric ||
    type === ApmDocumentType.TransactionMetric
  ) {
    return `STATS avg_throughput = AVG(transaction.duration.summary)`;
  }

  return `STATS avg_throughput = AVG((transaction.duration.us * transaction.representative_count) / transaction.representative_count)`;
}

function getTransactionLatencyPercentilesQuery(type: ApmDocumentType) {
  if (type === ApmDocumentType.TransactionEvent) {
    return `STATS percentile_throughput = PERCENTILES(transaction.duration.us, ?percentile)`;
  }
  return `STATS percentile_throughput = PERCENTILES(transaction.duration.histogram, ?percentile)`;
}

function getTransactionFailureRateQuery(type: ApmDocumentType) {
  if (type === ApmDocumentType.ServiceTransactionMetric) {
    return `STATS failure_rate = COUNT(event.success_count) / SUM(event.success_count)`;
  }

  return `EVAL is_failed = CASE(event.outcome == "failed", 0, event.outcome == "success", 1, NULL) | STATS failure_rate = AVG(is_failed)`;
}

function getTransactionGroupsForService(type: ApmDocumentType) {
  return `STATS transaction_groups = VALUES(transaction.name)`;
}
