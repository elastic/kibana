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
