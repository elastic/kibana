/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const LAST_HOUR = i18n.translate('xpack.securitySolution.stepDefineRule.lastHour', {
  defaultMessage: 'Last hour',
});

export const LAST_DAY = i18n.translate('xpack.securitySolution.stepDefineRule.lastDay', {
  defaultMessage: 'Last day',
});

export const LAST_WEEK = i18n.translate('xpack.securitySolution.stepDefineRule.lastWeek', {
  defaultMessage: 'Last week',
});

export const LAST_MONTH = i18n.translate('xpack.securitySolution.stepDefineRule.lastMonth', {
  defaultMessage: 'Last month',
});

export const QUERY_PREVIEW_BUTTON = i18n.translate(
  'xpack.securitySolution.stepDefineRule.previewQueryButton',
  {
    defaultMessage: 'Preview results',
  }
);

export const PREVIEW_TIMEOUT_WARNING = i18n.translate(
  'xpack.securitySolution.stepDefineRule.previewTimeoutWarning',
  {
    defaultMessage: 'Preview timed out after 60 seconds',
  }
);

export const QUERY_PREVIEW_SELECT_ARIA = i18n.translate(
  'xpack.securitySolution.stepDefineRule.previewQueryAriaLabel',
  {
    defaultMessage: 'Query preview timeframe select',
  }
);

export const QUERY_PREVIEW_LABEL = i18n.translate(
  'xpack.securitySolution.detectionEngine.queryPreview.queryPreviewLabel',
  {
    defaultMessage: 'Quick query preview',
  }
);

export const QUERY_PREVIEW_HELP_TEXT = i18n.translate(
  'xpack.securitySolution.detectionEngine.queryPreview.queryPreviewHelpText',
  {
    defaultMessage: 'Select a timeframe of data to preview query results.',
  }
);

export const QUERY_GRAPH_COUNT = i18n.translate(
  'xpack.securitySolution.detectionEngine.queryPreview.queryGraphCountLabel',
  {
    defaultMessage: 'Count',
  }
);

export const QUERY_GRAPH_HITS_TITLE = i18n.translate(
  'xpack.securitySolution.detectionEngine.queryPreview.queryPreviewTitle',
  {
    defaultMessage: 'Rule Preview',
  }
);

export const QUERY_PREVIEW_NOISE_WARNING = i18n.translate(
  'xpack.securitySolution.detectionEngine.queryPreview.queryGraphPreviewNoiseWarning',
  {
    defaultMessage:
      'Noise warning: This rule may cause a lot of noise. Consider narrowing your query. This is based on a linear progression of 1 alert per hour.',
  }
);

export const QUERY_PREVIEW_ERROR = i18n.translate(
  'xpack.securitySolution.detectionEngine.queryPreview.queryGraphPreviewError',
  {
    defaultMessage: 'Error fetching preview',
  }
);

export const QUERY_PREVIEW_DISCLAIMER = i18n.translate(
  'xpack.securitySolution.detectionEngine.queryPreview.queryPreviewDisclaimer',
  {
    defaultMessage:
      'Note: This preview excludes effects of rule exceptions and timestamp overrides.',
  }
);

export const PREVIEW_HISTOGRAM_DISCLAIMER = i18n.translate(
  'xpack.securitySolution.detectionEngine.queryPreview.histogramDisclaimer',
  {
    defaultMessage:
      'Note: Alerts with multiple event.category values will be counted more than once.',
  }
);

export const ML_PREVIEW_HISTOGRAM_DISCLAIMER = i18n.translate(
  'xpack.securitySolution.detectionEngine.queryPreview.mlHistogramDisclaimer',
  {
    defaultMessage: 'Note: Alerts with multiple host.name values will be counted more than once.',
  }
);

export const QUERY_PREVIEW_SEE_ALL_ERRORS = i18n.translate(
  'xpack.securitySolution.detectionEngine.queryPreview.queryPreviewSeeAllErrors',
  {
    defaultMessage: 'See all errors',
  }
);

export const QUERY_PREVIEW_SEE_ALL_WARNINGS = i18n.translate(
  'xpack.securitySolution.detectionEngine.queryPreview.queryPreviewSeeAllWarnings',
  {
    defaultMessage: 'See all warnings',
  }
);

export const ACTIONS = i18n.translate(
  'xpack.securitySolution.detectionEngine.queryPreview.actions',
  {
    defaultMessage: 'Actions',
  }
);

export const VIEW_DETAILS = i18n.translate(
  'xpack.securitySolution.detectionEngine.queryPreview.viewDetailsAriaLabel',
  {
    defaultMessage: 'View details',
  }
);

export const VIEW_DETAILS_FOR_ROW = ({
  ariaRowindex,
  columnValues,
}: {
  ariaRowindex: number;
  columnValues: string;
}) =>
  i18n.translate('xpack.securitySolution.detectionEngine.queryPreview.viewDetailsForRowAriaLabel', {
    values: { ariaRowindex, columnValues },
    defaultMessage:
      'View details for the alert or event in row {ariaRowindex}, with columns {columnValues}',
  });
