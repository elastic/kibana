/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

export enum Timings {
  Blocked = 'blocked',
  Dns = 'dns',
  Connect = 'connect',
  Ssl = 'ssl',
  Send = 'send',
  Wait = 'wait',
  Receive = 'receive',
}

export const FriendlyTimingLabels = {
  [Timings.Blocked]: i18n.translate(
    'xpack.uptime.synthetics.waterfallChart.labels.timings.blocked',
    {
      defaultMessage: 'Queued / Blocked',
    }
  ),
  [Timings.Dns]: i18n.translate('xpack.uptime.synthetics.waterfallChart.labels.timings.dns', {
    defaultMessage: 'DNS',
  }),
  [Timings.Connect]: i18n.translate(
    'xpack.uptime.synthetics.waterfallChart.labels.timings.connect',
    {
      defaultMessage: 'Connecting',
    }
  ),
  [Timings.Ssl]: i18n.translate('xpack.uptime.synthetics.waterfallChart.labels.timings.ssl', {
    defaultMessage: 'SSL',
  }),
  [Timings.Send]: i18n.translate('xpack.uptime.synthetics.waterfallChart.labels.timings.send', {
    defaultMessage: 'Sending request',
  }),
  [Timings.Wait]: i18n.translate('xpack.uptime.synthetics.waterfallChart.labels.timings.wait', {
    defaultMessage: 'Waiting (TTFB)',
  }),
  [Timings.Receive]: i18n.translate(
    'xpack.uptime.synthetics.waterfallChart.labels.timings.receive',
    {
      defaultMessage: 'Content downloading',
    }
  ),
};

export const TIMING_ORDER = [
  Timings.Blocked,
  Timings.Dns,
  Timings.Connect,
  Timings.Ssl,
  Timings.Send,
  Timings.Wait,
  Timings.Receive,
] as const;

export type CalculatedTimings = {
  [K in Timings]?: number;
};

export enum MimeType {
  Html = 'html',
  Script = 'script',
  Stylesheet = 'stylesheet',
  Media = 'media',
  Font = 'font',
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
  [MimeType.Other]: i18n.translate(
    'xpack.uptime.synthetics.waterfallChart.labels.mimeTypes.other',
    {
      defaultMessage: 'Other',
    }
  ),
};

// NOTE: This list tries to cover the standard spec compliant mime types,
// and a few popular non-standard ones, but it isn't exhaustive.
export const MimeTypesMap: Record<string, MimeType> = {
  'text/html': MimeType.Html,
  'application/javascript': MimeType.Script,
  'text/javascript': MimeType.Script,
  'text/css': MimeType.Stylesheet,
  // Images
  'image/apng': MimeType.Media,
  'image/bmp': MimeType.Media,
  'image/gif': MimeType.Media,
  'image/x-icon': MimeType.Media,
  'image/jpeg': MimeType.Media,
  'image/png': MimeType.Media,
  'image/svg+xml': MimeType.Media,
  'image/tiff': MimeType.Media,
  'image/webp': MimeType.Media,
  // Common audio / video formats
  'audio/wave': MimeType.Media,
  'audio/wav': MimeType.Media,
  'audio/x-wav': MimeType.Media,
  'audio/x-pn-wav': MimeType.Media,
  'audio/webm': MimeType.Media,
  'video/webm': MimeType.Media,
  'audio/ogg': MimeType.Media,
  'video/ogg': MimeType.Media,
  'application/ogg': MimeType.Media,
  // Fonts
  'font/otf': MimeType.Font,
  'font/ttf': MimeType.Font,
  'font/woff': MimeType.Font,
  'font/woff2': MimeType.Font,
  'application/x-font-opentype': MimeType.Font,
  'application/font-woff': MimeType.Font,
  'application/font-woff2': MimeType.Font,
  'application/vnd.ms-fontobject': MimeType.Font,
  'application/font-sfnt': MimeType.Font,
};

export interface NetworkItem {
  timestamp: string;
  method: string;
  url: string;
  status: number;
  mimeType?: string;
  // NOTE: This is the time the request was actually issued. timing.request_time might be later if the request was queued.
  requestSentTime: number;
  responseReceivedTime: number;
  // NOTE: Denotes the earlier figure out of request sent time and request start time (part of timings). This can vary based on queue times, and
  // also whether an entry actually has timings available.
  // Ref: https://github.com/ChromeDevTools/devtools-frontend/blob/ed2a064ac194bfae4e25c4748a9fa3513b3e9f7d/front_end/network/RequestTimingView.js#L154
  earliestRequestTime: number;
  timings: CalculatedTimings | null;
}
export type NetworkItems = NetworkItem[];

// NOTE: A number will always be present if the property exists, but that number might be -1, which represents no value.
export interface PayloadTimings {
  dns_start: number;
  push_end: number;
  worker_fetch_start: number;
  worker_respond_with_settled: number;
  proxy_end: number;
  worker_start: number;
  worker_ready: number;
  send_end: number;
  connect_end: number;
  connect_start: number;
  send_start: number;
  proxy_start: number;
  push_start: number;
  ssl_end: number;
  receive_headers_end: number;
  ssl_start: number;
  request_time: number;
  dns_end: number;
}

export interface ExtraSeriesConfig {
  colour: string;
}

export type SidebarItem = Pick<NetworkItem, 'url' | 'status' | 'method'>;
export type SidebarItems = SidebarItem[];

export interface LegendItem {
  name: string;
  colour: string;
}
export type LegendItems = LegendItem[];
