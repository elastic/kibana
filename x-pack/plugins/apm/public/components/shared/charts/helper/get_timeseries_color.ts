/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { euiPaletteColorBlind } from '@elastic/eui';

const palette = euiPaletteColorBlind({ rotations: 2 });

export const enum ChartType {
  LATENCY_AVG,
  THROUGHPUT,
  FAILED_TRANSACTION_RATE,
  CPU_USAGE,
  MEMORY_USAGE,
}

const colorMap: Record<ChartType, [number, number]> = {
  [ChartType.LATENCY_AVG]: [1, 11],
  [ChartType.THROUGHPUT]: [0, 10],
  [ChartType.FAILED_TRANSACTION_RATE]: [7, 17],
  [ChartType.CPU_USAGE]: [3, 13],
  [ChartType.MEMORY_USAGE]: [8, 18],
};

export function getTimeSeriesColor(chartType: ChartType) {
  const val = colorMap[chartType];

  return {
    currentPeriodColor: palette[val[0]] || palette[0],
    previousPeriodColor: palette[val[1]] || palette[1],
  };
}
