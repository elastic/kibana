/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

interface PlotProperties {
  x: number;
  y: number;
  y0: number;
}

export interface WaterfallDataSeriesConfigProperties {
  tooltipProps?: Record<string, string | number>;
  showTooltip: boolean;
}

export type WaterfallDataEntry = PlotProperties & {
  config: WaterfallDataSeriesConfigProperties & Record<string, unknown>;
};

export type WaterfallData = WaterfallDataEntry[];
