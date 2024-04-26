/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const AI_IS_CURRENTLY_ANALYZING = (alertsCount: number) =>
  i18n.translate(
    'xpack.securitySolution.aiInsights.loadingCallout.countdown.aiIsCurrentlyAnalyzing',
    {
      defaultMessage: `AI is currently analyzing up to {alertsCount} {alertsCount, plural, =1 {alert} other {alerts}} in the last 24 hours to generate insights`,
      values: { alertsCount },
    }
  );

export const ABOVE_THE_AVERAGE_TIME = i18n.translate(
  'xpack.securitySolution.aiInsights.loadingCallout.countdown.aboveTheAverageTimeLabel',
  {
    defaultMessage: 'Above the average time:',
  }
);

export const APPROXIMATE_TIME_REMAINING = i18n.translate(
  'xpack.securitySolution.aiInsights.loadingCallout.countdown.approximateTimeRemainingLabel',
  {
    defaultMessage: 'Approximate time remaining:',
  }
);

export const AVERAGE_TIME = i18n.translate(
  'xpack.securitySolution.aiInsights.loadingCallout.countdown.averageTimeLabel',
  {
    defaultMessage: 'Average time',
  }
);
