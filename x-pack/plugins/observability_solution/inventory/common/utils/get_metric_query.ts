/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MetricDefinition } from '../metrics';

export function getMetricQuery({
  metric,
  indexPatterns,
}: {
  metric: Pick<MetricDefinition, 'id' | 'expression' | 'filter'>;
  indexPatterns: string[];
}) {
  return {
    query: `FROM ${indexPatterns.join(',')} | STATS \`${metric.id}\` = ${
      metric.expression || `COUNT()`
    }`,
    kuery: metric.filter || '',
  };
}
