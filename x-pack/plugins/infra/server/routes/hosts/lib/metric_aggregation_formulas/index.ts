/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { estypes } from '@elastic/elasticsearch';
import { HostMetricType } from '../../../../../common/http_api/hosts';
import { cpu } from './cpu';
import { diskLatency } from './disk_latency';
import { memoryTotal } from './memory_total';
import { memory } from './memory';
import { rx } from './rx';
import { tx } from './tx';
import type { HostsMetricsAggregationQueryConfig } from '../types';

export const metricsAggregationFormulas: Record<
  HostMetricType,
  HostsMetricsAggregationQueryConfig
> = {
  cpu,
  diskLatency,
  memory,
  memoryTotal,
  rx,
  tx,
};

export const createQueryFormulas = (metricTypes: HostMetricType[]) => {
  return metricTypes
    .filter((type) => !!metricsAggregationFormulas[type])
    .reduce(
      (acc, curr) => {
        const hasRuntimeField = !!metricsAggregationFormulas[curr].runtimeField;
        const currentMetricAggregation = hasRuntimeField
          ? {
              filter: metricsAggregationFormulas[curr].filter,
              aggs: {
                result: {
                  ...metricsAggregationFormulas[curr].aggregation,
                },
              },
            }
          : {
              ...metricsAggregationFormulas[curr].aggregation,
            };

        return {
          ...acc,
          runtimeFields: {
            ...acc.runtimeFields,
            ...(metricsAggregationFormulas[curr].runtimeField ?? {}),
          },
          metricAggregations: {
            ...acc.metricAggregations,
            [curr]: currentMetricAggregation,
          },
        };
      },
      {} as {
        runtimeFields: estypes.MappingRuntimeFields;
        metricAggregations: Record<string, estypes.AggregationsAggregationContainer>;
      }
    );
};
