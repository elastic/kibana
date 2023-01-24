/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MetricsExplorerRow } from '../../../../../common/http_api/metrics_explorer';

export function averageOfValues(values: number[]) {
  const sum = values.reduce((acc, value) => acc + value, 0);
  return sum / values.length;
}

export function makeUnpackMetric<T extends string>(metricByField: Record<T, string>) {
  // Make sure metrics are accessed as row[metricByField['FIELD_NAME']]
  // Not row['FIELD_NAME'] by accident
  return (row: MetricsExplorerRow, field: T) => row[metricByField[field]] as number | null;
}

export function scaleUpPercentage(unscaled: number) {
  // Scale e.g. 0.027 to 2.7
  return unscaled * 100;
}
