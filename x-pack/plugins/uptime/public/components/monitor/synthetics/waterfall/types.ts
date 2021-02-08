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

export interface WaterfallMetaDataItem {
  name: string;
  value?: string;
}

export interface WaterfallMetaDataEntry {
  x: number;
  url: string;
  requestHeaders?: WaterfallMetaDataItem[];
  responseHeaders?: WaterfallMetaDataItem[];
  certificates?: WaterfallMetaDataItem[];
  details: WaterfallMetaDataItem[];
}

export type WaterfallDataEntry = PlotProperties & {
  config: WaterfallDataSeriesConfigProperties & Record<string, unknown>;
};

export type WaterfallMetaData = WaterfallMetaDataEntry[];

export type WaterfallData = WaterfallDataEntry[];

export type RenderItem<I = any> = (item: I, index: number) => JSX.Element;
