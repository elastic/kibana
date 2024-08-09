/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mapValues, isNumber } from 'lodash';
import { EntityMetrics } from '../../../../common/entities/types';
import { MergedServiceEntities } from '../types';

export function calculateAvgMetrics(entities: MergedServiceEntities[]) {
  return entities.map((entity) => {
    const transformedMetrics = mergeMetrics(entity.metrics);
    const averages = mapValues(transformedMetrics, (values: number[]) => {
      const sum = values.reduce((acc: number, val: number) => acc + (val !== null ? val : 0), 0);
      return sum / values.length;
    });

    return {
      ...entity,
      metrics: averages,
    };
  });
}
type MetricsKey = keyof EntityMetrics;

export function mergeMetrics(metrics: EntityMetrics[]) {
  return metrics.reduce((acc, metric) => {
    for (const key in metric) {
      if (metric.hasOwnProperty(key)) {
        const metricsKey = key as MetricsKey;

        const value = metric[metricsKey];
        if (isNumber(value)) {
          if (!acc[metricsKey]) {
            acc[metricsKey] = [];
          }
          acc[metricsKey].push(value);
        }
      }
    }
    return acc;
  }, {} as { [key in MetricsKey]: number[] });
}
