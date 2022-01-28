/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const VALUE_MUST_BE_GREATER_THAN_ZERO = i18n.translate(
  'xpack.uptime.settings.invalid.error',
  {
    defaultMessage: 'Value must be greater than 0.',
  }
);

export const VALUE_MUST_BE_AN_INTEGER = i18n.translate('xpack.uptime.settings.invalid.nanError', {
  defaultMessage: 'Value must be an integer.',
});

export const MonitorStatusTranslations = {
  defaultActionMessage: i18n.translate('xpack.uptime.alerts.monitorStatus.defaultActionMessage', {
    defaultMessage:
      'Monitor {monitorName} with url {monitorUrl} from {observerLocation} {statusMessage} The latest error message is {latestErrorMessage}',
    values: {
      monitorName: '{{state.monitorName}}',
      monitorUrl: '{{{state.monitorUrl}}}',
      statusMessage: '{{{state.statusMessage}}}',
      latestErrorMessage: '{{{state.latestErrorMessage}}}',
      observerLocation: '{{state.observerLocation}}',
    },
  }),
  name: i18n.translate('xpack.uptime.alerts.monitorStatus.clientName', {
    defaultMessage: 'Uptime monitor status',
  }),
  description: i18n.translate('xpack.uptime.alerts.monitorStatus.description', {
    defaultMessage: 'Alert when a monitor is down or an availability threshold is breached.',
  }),
};

export const TlsTranslations = {
  defaultActionMessage: i18n.translate('xpack.uptime.alerts.tls.defaultActionMessage', {
    defaultMessage: `Detected TLS certificate {commonName} from issuer {issuer} is {status}. Certificate {summary}
`,
    values: {
      commonName: '{{state.commonName}}',
      issuer: '{{state.issuer}}',
      summary: '{{state.summary}}',
      status: '{{state.status}}',
    },
  }),
  name: i18n.translate('xpack.uptime.alerts.tls.clientName', {
    defaultMessage: 'Uptime TLS',
  }),
  description: i18n.translate('xpack.uptime.alerts.tls.description', {
    defaultMessage: 'Alert when the TLS certificate of an Uptime monitor is about to expire.',
  }),
};

export const TlsTranslationsLegacy = {
  defaultActionMessage: i18n.translate('xpack.uptime.alerts.tls.legacy.defaultActionMessage', {
    defaultMessage: `Detected {count} TLS certificates expiring or becoming too old.
{expiringConditionalOpen}
Expiring cert count: {expiringCount}
Expiring Certificates: {expiringCommonNameAndDate}
{expiringConditionalClose}
{agingConditionalOpen}
Aging cert count: {agingCount}
Aging Certificates: {agingCommonNameAndDate}
{agingConditionalClose}
`,
    values: {
      count: '{{state.count}}',
      expiringCount: '{{state.expiringCount}}',
      expiringCommonNameAndDate: '{{state.expiringCommonNameAndDate}}',
      expiringConditionalOpen: '{{#state.hasExpired}}',
      expiringConditionalClose: '{{/state.hasExpired}}',
      agingCount: '{{state.agingCount}}',
      agingCommonNameAndDate: '{{state.agingCommonNameAndDate}}',
      agingConditionalOpen: '{{#state.hasAging}}',
      agingConditionalClose: '{{/state.hasAging}}',
    },
  }),
  name: i18n.translate('xpack.uptime.alerts.tls.legacy.clientName', {
    defaultMessage: 'Uptime TLS (Legacy)',
  }),
  description: i18n.translate('xpack.uptime.alerts.tls.legacy.description', {
    defaultMessage:
      'Alert when the TLS certificate of an Uptime monitor is about to expire. This alert will be deprecated in a future version.',
  }),
};

export const DurationAnomalyTranslations = {
  defaultActionMessage: i18n.translate('xpack.uptime.alerts.durationAnomaly.defaultActionMessage', {
    defaultMessage: `Abnormal ({severity} level) response time detected on {monitor} with url {monitorUrl} at {anomalyStartTimestamp}. Anomaly severity score is {severityScore}.
Response times as high as {slowestAnomalyResponse} have been detected from location {observerLocation}. Expected response time is {expectedResponseTime}.`,
    values: {
      severity: '{{state.severity}}',
      anomalyStartTimestamp: '{{state.anomalyStartTimestamp}}',
      monitor: '{{state.monitor}}',
      monitorUrl: '{{{state.monitorUrl}}}',
      slowestAnomalyResponse: '{{state.slowestAnomalyResponse}}',
      expectedResponseTime: '{{state.expectedResponseTime}}',
      severityScore: '{{state.severityScore}}',
      observerLocation: '{{state.observerLocation}}',
    },
  }),
  name: i18n.translate('xpack.uptime.alerts.durationAnomaly.clientName', {
    defaultMessage: 'Uptime Duration Anomaly',
  }),
  description: i18n.translate('xpack.uptime.alerts.durationAnomaly.description', {
    defaultMessage: 'Alert when the Uptime monitor duration is anomalous.',
  }),
};
