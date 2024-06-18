/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mapValues } from 'lodash';
import { EntityMetrics, MergedServiceEntities } from '../types';

export function calculateAvgMetrics(entities: MergedServiceEntities[]) {
  return entities.map((entity) => {
    const transformedMetrics = mergeMetrics(entity.metrics);
    const averages = mapValues(transformedMetrics, (values) => {
      const sum = values.reduce((acc, val) => acc + (val !== null ? val : 0), 0);
      return sum / values.length;
    });

    return {
      ...entity,
      metrics: averages,
    };
  });
}

export function mergeMetrics(metrics: EntityMetrics[]) {
  const mergedMetrics: { [key: string]: number[] } = {};
  metrics.forEach((metric) => {
    Object.keys(metric).forEach((key) => {
      const value = metric[key as keyof EntityMetrics];
      if (value) {
        if (!mergedMetrics[key]) {
          mergedMetrics[key] = [];
        }
        mergedMetrics[key].push(value);
      }
    });
  });

  return mergedMetrics;
}
