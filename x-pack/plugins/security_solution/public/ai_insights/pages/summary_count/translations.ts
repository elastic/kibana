/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const ALERTS = (alertsCount: number) =>
  i18n.translate('xpack.securitySolution.aiInsights.summaryCount.alertsLabel', {
    defaultMessage: `{alertsCount} {alertsCount, plural, =1 {alert} other {alerts}}`,
    values: { alertsCount },
  });

export const INSIGHTS = (insightsCount: number) =>
  i18n.translate('xpack.securitySolution.aiInsights.summaryCount.insightsLabel', {
    defaultMessage: `{insightsCount} {insightsCount, plural, =1 {insight} other {insights}}`,
    values: { insightsCount },
  });

export const LAST_GENERATED = i18n.translate(
  'xpack.securitySolution.aiInsights.summaryCount.lastGeneratedLabel',
  {
    defaultMessage: 'Generated',
  }
);
