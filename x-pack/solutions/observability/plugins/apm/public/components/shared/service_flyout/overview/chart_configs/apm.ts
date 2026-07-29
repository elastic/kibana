/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ComposerQuery } from '@elastic/esql';
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
  TRANSACTION_DURATION,
  TRANSACTION_TYPE,
} from '../../../../../../common/es_fields/apm';
import { ChartType } from '../../../charts/helper/get_timeseries_color';
import {
  CGROUP_LIMIT_MAX_VALUE,
  TIME_BUCKET_BY,
  TIME_BUCKET_FIELD,
  applyServiceFilters,
  buildChartDefinition,
  seriesColor,
} from './shared';
import type {
  EcsServiceScope,
  FlyoutLensChartConfigDefinition,
  FlyoutLensChartProcessorEvent,
  ServiceScope,
} from './shared';

function createApmBaseQuery({
  indexes,
  processorEvent,
  scope,
}: {
  indexes: string;
  processorEvent: FlyoutLensChartProcessorEvent;
  scope: EcsServiceScope;
}): ComposerQuery {
  const { transactionType } = scope;
  const query = esql.from(indexes).where`${esql.col(PROCESSOR_EVENT)} == ${processorEvent}`;
  if (transactionType) {
    query.where`${esql.col(TRANSACTION_TYPE)} == ${transactionType}`;
  }
  applyServiceFilters(query, scope);
  return query;
}

export function buildApmLatencyQuery(
  indexes: string,
  scope: EcsServiceScope,
  aggregation: string
): ComposerQuery {
  const query = createApmBaseQuery({ indexes, processorEvent: 'transaction', scope });
  query.pipe(`EVAL duration_ms = TO_DOUBLE(${TRANSACTION_DURATION}) / 1000`);
  query.pipe(`STATS ${aggregation} BY ${TIME_BUCKET_BY}`);
  return query;
}

export function buildApmThroughputQuery(indexes: string, scope: EcsServiceScope): ComposerQuery {
  const query = createApmBaseQuery({ indexes, processorEvent: 'transaction', scope });
  query.pipe(`STATS COUNT(*) BY ${TIME_BUCKET_BY}`);
  return query;
}

export function buildApmErrorRateQuery(indexes: string, scope: EcsServiceScope): ComposerQuery {
  const query = createApmBaseQuery({ indexes, processorEvent: 'transaction', scope });
  query.pipe(
    `STATS failure = COUNT(*) WHERE TO_STRING(${EVENT_OUTCOME}) == "failure", all = COUNT(*) WHERE (TO_STRING(${EVENT_OUTCOME}) IN ("failure", "success")) BY ${TIME_BUCKET_BY}`
  );
  query.pipe('EVAL failed_transaction_rate = CASE(all > 0, TO_DOUBLE(failure) / all, NULL)');
  query.pipe(`KEEP ${TIME_BUCKET_FIELD}, failed_transaction_rate`);
  query.pipe(`SORT ${TIME_BUCKET_FIELD}`);
  return query;
}

export const APM_ERROR_RATE_TITLE = i18n.translate(
  'xpack.apm.serviceFlyout.failedTransactionRateChartTitle',
  { defaultMessage: 'Failed transaction rate' }
);

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
      const query = createApmBaseQuery({ indexes: idx, processorEvent: 'metric', scope });
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
      const query = createApmBaseQuery({ indexes: idx, processorEvent: 'metric', scope });
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
      query.pipe(`KEEP ${TIME_BUCKET_FIELD}, memory_usage`);
      query.pipe(`SORT ${TIME_BUCKET_FIELD}`);
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
