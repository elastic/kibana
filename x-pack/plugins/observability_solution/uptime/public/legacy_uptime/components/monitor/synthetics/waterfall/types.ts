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

export interface WaterfallMetadataItem {
  name: string;
  value?: string;
}

export interface WaterfallMetadataEntry {
  x: number;
  url: string;
  requestHeaders?: WaterfallMetadataItem[];
  responseHeaders?: WaterfallMetadataItem[];
  certificates?: WaterfallMetadataItem[];
  details: WaterfallMetadataItem[];
}

export type WaterfallDataEntry = PlotProperties & {
  config: WaterfallDataSeriesConfigProperties & Record<string, unknown>;
};

export type WaterfallMetadata = WaterfallMetadataEntry[];

export type WaterfallData = WaterfallDataEntry[];

export type RenderItem<I = any> = (item: I, index: number) => JSX.Element;
