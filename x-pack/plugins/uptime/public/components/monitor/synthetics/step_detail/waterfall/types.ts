/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { NetworkEvent } from '../../../../../../common/runtime_types';

export enum Timings {
  Blocked = 'blocked',
  Dns = 'dns',
  Connect = 'connect',
  Ssl = 'ssl',
  Send = 'send',
  Wait = 'wait',
  Receive = 'receive',
}

export enum Metadata {
  Status = 'status',
  ResourceSize = 'resourceSize',
  TransferSize = 'transferSize',
  CertificateIssuer = 'certificateIssuer',
  CertificateIssueDate = 'certificateIssueDate',
  CertificateExpiryDate = 'certificateExpiryDate',
  CertificateSubject = 'certificateSubject',
  IP = 'ip',
  MimeType = 'mimeType',
  RequestStart = 'requestStart',
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
    defaultMessage: 'TLS',
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

export const FriendlyFlyoutLabels = {
  [Metadata.Status]: i18n.translate(
    'xpack.uptime.synthetics.waterfallChart.labels.metadata.status',
    {
      defaultMessage: 'Status',
    }
  ),
  [Metadata.MimeType]: i18n.translate(
    'xpack.uptime.synthetics.waterfallChart.labels.metadata.contentType',
    {
      defaultMessage: 'Content type',
    }
  ),
  [Metadata.RequestStart]: i18n.translate(
    'xpack.uptime.synthetics.waterfallChart.labels.metadata.requestStart',
    {
      defaultMessage: 'Request start',
    }
  ),
  [Metadata.ResourceSize]: i18n.translate(
    'xpack.uptime.synthetics.waterfallChart.labels.metadata.resourceSize',
    {
      defaultMessage: 'Resource size',
    }
  ),
  [Metadata.TransferSize]: i18n.translate(
    'xpack.uptime.synthetics.waterfallChart.labels.metadata.transferSize',
    {
      defaultMessage: 'Transfer size',
    }
  ),
  [Metadata.CertificateIssuer]: i18n.translate(
    'xpack.uptime.synthetics.waterfallChart.labels.metadata.certificateIssuer',
    {
      defaultMessage: 'Issuer',
    }
  ),
  [Metadata.CertificateIssueDate]: i18n.translate(
    'xpack.uptime.synthetics.waterfallChart.labels.metadata.certificateIssueDate',
    {
      defaultMessage: 'Valid from',
    }
  ),
  [Metadata.CertificateExpiryDate]: i18n.translate(
    'xpack.uptime.synthetics.waterfallChart.labels.metadata.certificateExpiryDate',
    {
      defaultMessage: 'Valid until',
    }
  ),
  [Metadata.CertificateSubject]: i18n.translate(
    'xpack.uptime.synthetics.waterfallChart.labels.metadata.certificateSubject',
    {
      defaultMessage: 'Common name',
    }
  ),
  [Metadata.IP]: i18n.translate('xpack.uptime.synthetics.waterfallChart.labels.metadata.ip', {
    defaultMessage: 'IP',
  }),
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

export const META_DATA_ORDER_FLYOUT = [
  Metadata.MimeType,
  Timings.Dns,
  Timings.Connect,
  Timings.Ssl,
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
  'video/mp4': MimeType.Media,
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

  // XHR
  'application/json': MimeType.XHR,
};

export type NetworkItem = NetworkEvent;
export type NetworkItems = NetworkItem[];

export type SidebarItem = Pick<NetworkItem, 'url' | 'status' | 'method'> & {
  isHighlighted: boolean;
  index: number;
  offsetIndex: number;
};
export type SidebarItems = SidebarItem[];

export interface LegendItem {
  name: string;
  colour: string;
}
export type LegendItems = LegendItem[];
