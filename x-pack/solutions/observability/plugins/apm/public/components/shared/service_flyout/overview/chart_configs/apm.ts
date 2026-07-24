/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactNode } from 'react';
import { esql } from '@elastic/esql';
import { i18n } from '@kbn/i18n';
import {
  EVENT_OUTCOME,
  METRIC_CGROUP_MEMORY_LIMIT_BYTES,
  METRIC_CGROUP_MEMORY_USAGE_BYTES,
  METRIC_SYSTEM_CPU_PERCENT,
  METRIC_SYSTEM_FREE_MEMORY,
  METRIC_SYSTEM_TOTAL_MEMORY,
  PROCESSOR_EVENT,
  SERVICE_ENVIRONMENT,
  SERVICE_NAME,
  TRANSACTION_DURATION,
  TRANSACTION_TYPE,
} from '../../../../../../common/es_fields/apm';
import {
  ENVIRONMENT_ALL,
  ENVIRONMENT_NOT_DEFINED,
} from '../../../../../../common/environment_filter_values';
import type { LatencyAggregationType } from '../../../../../../common/latency_aggregation_types';
import { ChartType } from '../../../charts/helper/get_timeseries_color';
import {
  CGROUP_LIMIT_MAX_VALUE,
  TIME_BUCKET_BY,
  buildChartDefinition,
  getLatencyAggregationConfig,
  getLatencyChartType,
  seriesColor,
} from './shared';
import type {
  FlyoutLensChartConfigDefinition,
  FlyoutLensChartProcessorEvent,
  ServiceScope,
} from './shared';

function createBaseServiceQuery({
  indexes,
  processorEvent,
  scope,
}: {
  indexes: string;
  processorEvent: FlyoutLensChartProcessorEvent;
  scope: ServiceScope;
}) {
  const { serviceName, environment, transactionType } = scope;

  const query = esql.from(indexes).where`${esql.col(PROCESSOR_EVENT)} == ${processorEvent}`
    .where`${esql.col(SERVICE_NAME)} == ${serviceName}`;

  if (transactionType) {
    query.where`${esql.col(TRANSACTION_TYPE)} == ${transactionType}`;
  }

  // ENVIRONMENT_NOT_DEFINED is a sentinel pushed into the environments list when documents with no
  // service.environment field exist: https://github.com/elastic/kibana/blob/main/x-pack/solutions/observability/plugins/apm/server/routes/environments/get_environments.ts
  // This ES|QL clause mirrors the DSL equivalent in: https://github.com/elastic/kibana/blob/main/x-pack/solutions/observability/plugins/apm/common/utils/environment_query.ts
  if (environment === ENVIRONMENT_NOT_DEFINED.value) {
    query.where`${esql.col(SERVICE_ENVIRONMENT)} == ${ENVIRONMENT_NOT_DEFINED.value} OR ${esql.col(
      SERVICE_ENVIRONMENT
    )} IS NULL`;
  } else if (environment !== ENVIRONMENT_ALL.value) {
    query.where`${esql.col(SERVICE_ENVIRONMENT)} == ${environment}`;
  }

  return query;
}

export function getLatencyChart(
  indexes: string | undefined,
  scope: ServiceScope,
  latencyAggregationType: LatencyAggregationType,
  titleAction?: ReactNode
): FlyoutLensChartConfigDefinition {
  const { label, aggregation } = getLatencyAggregationConfig(latencyAggregationType);

  return buildChartDefinition({
    id: 'latency',
    title: i18n.translate('xpack.apm.serviceFlyout.latencyChartTitle', {
      defaultMessage: 'Latency',
    }),
    titleAction,
    indexes,
    buildQuery: (idx) => {
      const query = createBaseServiceQuery({ indexes: idx, processorEvent: 'transaction', scope });
      query.pipe(`EVAL duration_ms = TO_DOUBLE(${TRANSACTION_DURATION}) / 1000`);
      query.pipe(`STATS ${aggregation} BY ${TIME_BUCKET_BY}`);
      return query;
    },
    yAxis: [
      {
        label,
        value: aggregation,
        format: 'number',
        decimals: 0,
        suffix: ' ms',
        seriesColor: seriesColor(getLatencyChartType(latencyAggregationType)),
      },
    ],
  });
}

export function getThroughputChart(
  indexes: string | undefined,
  scope: ServiceScope
): FlyoutLensChartConfigDefinition {
  return buildChartDefinition({
    id: 'throughput',
    title: i18n.translate('xpack.apm.serviceFlyout.throughputChartTitle', {
      defaultMessage: 'Throughput',
    }),
    indexes,
    buildQuery: (idx) => {
      const query = createBaseServiceQuery({ indexes: idx, processorEvent: 'transaction', scope });
      query.pipe(`STATS COUNT(*) BY ${TIME_BUCKET_BY}`);
      return query;
    },
    yAxis: [
      {
        label: i18n.translate('xpack.apm.serviceFlyout.throughputSeriesLabel', {
          defaultMessage: 'Throughput',
        }),
        value: 'COUNT(*)',
        format: 'number',
        decimals: 0,
        seriesColor: seriesColor(ChartType.THROUGHPUT),
      },
    ],
  });
}

export function getFailedTransactionRateChart(
  indexes: string | undefined,
  scope: ServiceScope
): FlyoutLensChartConfigDefinition {
  const title = i18n.translate('xpack.apm.serviceFlyout.failedTransactionRateChartTitle', {
    defaultMessage: 'Failed transaction rate',
  });

  return buildChartDefinition({
    id: 'failedTransactionRate',
    title,
    indexes,
    buildQuery: (idx) => {
      const query = createBaseServiceQuery({ indexes: idx, processorEvent: 'transaction', scope });
      query.pipe(
        `STATS failure = COUNT(*) WHERE TO_STRING(${EVENT_OUTCOME}) == "failure", all = COUNT(*) WHERE TO_STRING(${EVENT_OUTCOME}) IN ("failure", "success") BY ${TIME_BUCKET_BY}`
      );
      query.pipe('EVAL failed_transaction_rate = CASE(all > 0, TO_DOUBLE(failure) / all, null)');
      query.pipe('KEEP timestamp, failed_transaction_rate');
      query.pipe('SORT timestamp');
      return query;
    },
    yBounds: { mode: 'custom', lowerBound: 0, upperBound: 1 },
    yAxis: [
      {
        label: title,
        value: 'failed_transaction_rate',
        format: 'percent',
        decimals: 1,
        seriesColor: seriesColor(ChartType.FAILED_TRANSACTION_RATE),
      },
    ],
  });
}

export function getCpuUsageChart(
  indexes: string | undefined,
  scope: ServiceScope
): FlyoutLensChartConfigDefinition {
  const cpuUsage = `AVG(TO_DOUBLE(${METRIC_SYSTEM_CPU_PERCENT}))`;
  const title = i18n.translate('xpack.apm.serviceFlyout.cpuUsageChartTitle', {
    defaultMessage: 'CPU usage',
  });

  return buildChartDefinition({
    id: 'cpuUsage',
    title,
    indexes,
    buildQuery: (idx) => {
      const query = createBaseServiceQuery({ indexes: idx, processorEvent: 'metric', scope });
      query.pipe(`WHERE TO_DOUBLE(${METRIC_SYSTEM_CPU_PERCENT}) IS NOT NULL`);
      query.pipe(`STATS ${cpuUsage} BY ${TIME_BUCKET_BY}`);
      return query;
    },
    yBounds: { mode: 'custom', lowerBound: 0, upperBound: 1 },
    yAxis: [
      {
        label: title,
        value: cpuUsage,
        format: 'percent',
        decimals: 1,
        seriesColor: seriesColor(ChartType.CPU_USAGE),
      },
    ],
  });
}

export function getMemoryUsageChart(
  indexes: string | undefined,
  scope: ServiceScope
): FlyoutLensChartConfigDefinition {
  const title = i18n.translate('xpack.apm.serviceFlyout.memoryUsageChartTitle', {
    defaultMessage: 'Memory usage',
  });

  return buildChartDefinition({
    id: 'memoryUsage',
    title,
    indexes,
    buildQuery: (idx) => {
      const query = createBaseServiceQuery({ indexes: idx, processorEvent: 'metric', scope });
      query.pipe(`EVAL cgroup_usage = TO_DOUBLE(${METRIC_CGROUP_MEMORY_USAGE_BYTES})`);
      query.pipe(`EVAL cgroup_limit = TO_DOUBLE(${METRIC_CGROUP_MEMORY_LIMIT_BYTES})`);
      query.pipe(`EVAL sys_free = TO_DOUBLE(${METRIC_SYSTEM_FREE_MEMORY})`);
      query.pipe(`EVAL sys_total = TO_DOUBLE(${METRIC_SYSTEM_TOTAL_MEMORY})`);
      query.pipe(
        'WHERE cgroup_usage IS NOT NULL OR (sys_free IS NOT NULL AND sys_total IS NOT NULL)'
      );
      query.pipe(
        `EVAL effective_total = CASE(cgroup_limit > 0 AND cgroup_limit != ${CGROUP_LIMIT_MAX_VALUE}, cgroup_limit, sys_total)`
      );
      query.pipe(
        'EVAL memory_usage = CASE(cgroup_usage IS NOT NULL AND effective_total > 0, cgroup_usage / effective_total, sys_total > 0 AND sys_free IS NOT NULL, 1 - sys_free / sys_total, NULL)'
      );
      query.pipe(`STATS memory_usage = AVG(memory_usage) BY ${TIME_BUCKET_BY}`);
      query.pipe('KEEP timestamp, memory_usage');
      query.pipe('SORT timestamp');
      return query;
    },
    yBounds: { mode: 'custom', lowerBound: 0, upperBound: 1 },
    yAxis: [
      {
        label: title,
        value: 'memory_usage',
        format: 'percent',
        decimals: 1,
        seriesColor: seriesColor(ChartType.MEMORY_USAGE),
      },
    ],
  });
}
