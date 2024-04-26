/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const ALERTS_WILL_BE_ANALYZED = (alertsCount: number) =>
  i18n.translate('xpack.securitySolution.aiInsights.pages.emptyPrompt.alertsWillBeAnalyzedTitle', {
    defaultMessage: '{alertsCount, plural, one {alert} other {alerts}} will be analyzed',
    values: { alertsCount },
  });

export const BASED_ON_SELECTED_FILTERS = i18n.translate(
  'xpack.securitySolution.aiInsights.pages.emptyPrompt.basedOnSelectedFiltersLabel',
  {
    defaultMessage: 'Based on the selected filters above.',
  }
);

export const GENERATE = i18n.translate(
  'xpack.securitySolution.aiInsights.pages.emptyPrompt.generateLabel',
  {
    defaultMessage: 'Generate',
  }
);

export const LEARN_MORE = i18n.translate(
  'xpack.securitySolution.aiInsights.pages.emptyPrompt.learnMoreLabel',
  {
    defaultMessage: 'Learn more',
  }
);

export const SELECT_A_CONNECTOR = i18n.translate(
  'xpack.securitySolution.aiInsights.pages.emptyPrompt.selectAConnectorLabel',
  {
    defaultMessage: 'Select a connector',
  }
);

export const START_GENERATING_INSIGHTS = i18n.translate(
  'xpack.securitySolution.aiInsights.pages.emptyPrompt.startGeneratingInsightsLabel',
  {
    defaultMessage: 'Start generating insights via Elastic AI Assistant.',
  }
);
