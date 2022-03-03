/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { euiPaletteColorBlind } from '@elastic/eui';

export const enum ChartType {
  LATENCY_AVG,
  LATENCY_P95,
  LATENCY_P99,
  THROUGHPUT,
  FAILED_TRANSACTION_RATE,
  CPU_USAGE,
  MEMORY_USAGE,
}

const palette = euiPaletteColorBlind({ rotations: 2 });

const timeSeriesColorMap: Record<
  ChartType,
  { currentPeriodColor: string; previousPeriodColor: string }
> = {
  [ChartType.LATENCY_AVG]: {
    currentPeriodColor: palette[1],
    previousPeriodColor: palette[11],
  },
  [ChartType.LATENCY_P95]: {
    currentPeriodColor: palette[5],
    previousPeriodColor: palette[15],
  },
  [ChartType.LATENCY_P99]: {
    currentPeriodColor: palette[7],
    previousPeriodColor: palette[17],
  },
  [ChartType.THROUGHPUT]: {
    currentPeriodColor: palette[0],
    previousPeriodColor: palette[10],
  },
  [ChartType.FAILED_TRANSACTION_RATE]: {
    currentPeriodColor: palette[7],
    previousPeriodColor: palette[17],
  },
  [ChartType.CPU_USAGE]: {
    currentPeriodColor: palette[3],
    previousPeriodColor: palette[13],
  },
  [ChartType.MEMORY_USAGE]: {
    currentPeriodColor: palette[8],
    previousPeriodColor: palette[18],
  },
};

export function getTimeSeriesColor(chartType: ChartType) {
  return timeSeriesColorMap[chartType];
}
