/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export enum ChartMetricType {
  LOG_ERROR_RATE,
  LOG_RATE,
}

const metricsFormulasMap: Record<ChartMetricType, string> = {
  [ChartMetricType.LOG_RATE]: `count(kql='log.level: *') / [PERIOD_IN_MINUTES]`,
  [ChartMetricType.LOG_ERROR_RATE]: `count(kql='log.level: "error" OR log.level: "ERROR"') / count(kql='log.level: *')`,
};

export function getMetricsFormula(chartMetricType: ChartMetricType) {
  return metricsFormulasMap[chartMetricType];
}
