/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

export const AnomalyTranslations = {
  criteriaAriaLabel: i18n.translate('xpack.uptime.alerts.anomaly.criteriaExpression.ariaLabel', {
    defaultMessage: 'An expression displaying the criteria for a selected monitor.',
  }),
  whenMonitor: i18n.translate('xpack.uptime.alerts.anomaly.criteriaExpression.description', {
    defaultMessage: 'When monitor',
  }),
  scoreAriaLabel: i18n.translate('xpack.uptime.alerts.anomaly.scoreExpression.ariaLabel', {
    defaultMessage: 'An expression displaying the criteria for an anomaly alert threshold.',
  }),
  hasAnomalyWithSeverity: i18n.translate(
    'xpack.uptime.alerts.anomaly.scoreExpression.description',
    {
      defaultMessage: 'has anomaly with severity',
      description: 'An expression displaying the criteria for an anomaly alert threshold.',
    }
  ),
};
