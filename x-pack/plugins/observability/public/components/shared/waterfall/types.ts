/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export enum MimeType {
  Html = 'html',
  Script = 'script',
  Stylesheet = 'stylesheet',
  Media = 'media',
  Font = 'font',
  XHR = 'xhr',
  Other = 'other',
}

export const FriendlyMimetypeLabels = {
  [MimeType.Html]: i18n.translate('xpack.uptime.synthetics.waterfallChart.labels.mimeTypes.html', {
    defaultMessage: 'HTML',
  }),
  [MimeType.Script]: i18n.translate(
    'xpack.uptime.synthetics.waterfallChart.labels.mimeTypes.script',
    {
      defaultMessage: 'JS',
    }
  ),
  [MimeType.Stylesheet]: i18n.translate(
    'xpack.uptime.synthetics.waterfallChart.labels.mimeTypes.stylesheet',
    {
      defaultMessage: 'CSS',
    }
  ),
  [MimeType.Media]: i18n.translate(
    'xpack.uptime.synthetics.waterfallChart.labels.mimeTypes.media',
    {
      defaultMessage: 'Media',
    }
  ),
  [MimeType.Font]: i18n.translate('xpack.uptime.synthetics.waterfallChart.labels.mimeTypes.font', {
    defaultMessage: 'Font',
  }),
  [MimeType.XHR]: i18n.translate('xpack.uptime.synthetics.waterfallChart.labels.mimeTypes.xhr', {
    defaultMessage: 'XHR',
  }),
  [MimeType.Other]: i18n.translate(
    'xpack.uptime.synthetics.waterfallChart.labels.mimeTypes.other',
    {
      defaultMessage: 'Other',
    }
  ),
};

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

export interface SidebarItem {
  isHighlighted: boolean;
  index: number;
  offsetIndex: number;
  url: string;
}

export type SidebarItems = SidebarItem[];

export interface LegendItem {
  name: string;
  colour: string;
}
export type LegendItems = LegendItem[];
