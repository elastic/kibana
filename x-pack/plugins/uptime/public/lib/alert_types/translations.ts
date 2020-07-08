/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

export const MonitorStatusTranslations = {
  defaultActionMessage: i18n.translate('xpack.uptime.alerts.monitorStatus.defaultActionMessage', {
    defaultMessage: '{contextMessage}\nLast triggered at: {lastTriggered}\n{downMonitors}',
    values: {
      contextMessage: '{{context.message}}',
      lastTriggered: '{{state.lastTriggeredAt}}',
      downMonitors: '{{context.downMonitorsWithGeo}}',
    },
  }),
  name: i18n.translate('xpack.uptime.alerts.monitorStatus.clientName', {
    defaultMessage: 'Uptime monitor status',
  }),
};

export const TlsTranslations = {
  defaultActionMessage: i18n.translate('xpack.uptime.alerts.tls.defaultActionMessage', {
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
  name: i18n.translate('xpack.uptime.alerts.tls.clientName', {
    defaultMessage: 'Uptime TLS',
  }),
};

export const DurationAnomalyTranslations = {
  defaultActionMessage: i18n.translate('xpack.uptime.alerts.durationAnomaly.defaultActionMessage', {
    defaultMessage: `A {severity} level anomaly with score {severityScore} was detected at {anomalyStartTimestamp} on {monitor} response duration in Uptime at url {monitorUrl}.
Response times as high as {slowestAnomalyResponse} have been detected from location {observerLocation}. Expected response time is {expectedResponseTime}.`,
    values: {
      severity: '{{state.severity}}',
      anomalyStartTimestamp: '{{state.anomalyStartTimestamp}}',
      monitor: '{{state.monitor}}',
      monitorUrl: '{{state.monitorUrl}}',
      slowestAnomalyResponse: '{{state.slowestAnomalyResponse}}',
      expectedResponseTime: '{{state.expectedResponseTime}}',
      severityScore: '{{state.severityScore}}',
      observerLocation: '{{state.observerLocation}}',
    },
  }),
  name: i18n.translate('xpack.uptime.alerts.durationAnomaly.clientName', {
    defaultMessage: 'Uptime Duration Anomaly',
  }),
};
