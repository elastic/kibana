/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';

export enum DataTypes {
  SYNTHETICS = 'synthetics',
  UPTIME = 'uptime',
  UX = 'ux',
  MOBILE = 'mobile',
  METRICS = 'infra_metrics',
  LOGS = 'infra_logs',
  ALERTS = 'alerts',
}

export const DataTypesLabels: Record<string, string> = {
  [DataTypes.UX]: i18n.translate('xpack.exploratoryView.uxLabel', {
    defaultMessage: 'User experience (RUM)',
  }),

  [DataTypes.SYNTHETICS]: i18n.translate('xpack.exploratoryView.syntheticsLabel', {
    defaultMessage: 'Synthetics monitoring',
  }),

  [DataTypes.UPTIME]: i18n.translate('xpack.exploratoryView.uptimeLabel', {
    defaultMessage: 'Uptime',
  }),

  [DataTypes.METRICS]: i18n.translate('xpack.exploratoryView.metricsLabel', {
    defaultMessage: 'Metrics',
  }),

  [DataTypes.LOGS]: i18n.translate('xpack.exploratoryView.logsLabel', {
    defaultMessage: 'Logs',
  }),

  [DataTypes.MOBILE]: i18n.translate('xpack.exploratoryView.mobileExperienceLabel', {
    defaultMessage: 'Mobile experience',
  }),
  [DataTypes.ALERTS]: i18n.translate('xpack.exploratoryView.alertsLabel', {
    defaultMessage: 'Alerts',
  }),
};
