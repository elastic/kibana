/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

export const PREVIEW_LABEL = i18n.translate(
  'xpack.securitySolution.stepDefineRule.previewQueryLabel',
  {
    defaultMessage: 'Preview results',
  }
);

export const PREVIEW_SELECT_ARIA = i18n.translate(
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
    defaultMessage: 'Select a timeframe of data to preview query results',
  }
);

export const QUERY_GRAPH_COUNT = i18n.translate(
  'xpack.securitySolution.detectionEngine.queryPreview.queryGraphCountLabel',
  {
    defaultMessage: 'Count',
  }
);

export const QUERY_GRAPH_HITS_TITLE = i18n.translate(
  'xpack.securitySolution.detectionEngine.queryPreview.queryGraphHitsTitle',
  {
    defaultMessage: 'Hits',
  }
);

export const QUERY_PREVIEW_TITLE = (hits: number) =>
  i18n.translate('xpack.securitySolution.detectionEngine.queryPreview.queryPreviewGraphTitle', {
    values: { hits },
    defaultMessage: '{hits} {hits, plural, =1 {hit} other {hits}}',
  });

export const QUERY_PREVIEW_THRESHOLD_WITH_FIELD_TITLE = (buckets: number) =>
  i18n.translate(
    'xpack.securitySolution.detectionEngine.queryPreview.queryPreviewGraphThresholdWithFieldTitle',
    {
      values: { buckets },
      defaultMessage: '{buckets} {buckets, plural, =1 {unique hit} other {unique hits}}',
    }
  );

export const QUERY_PREVIEW_INSPECT_TITLE = i18n.translate(
  'xpack.securitySolution.detectionEngine.queryPreview.queryGraphPreviewInspectTitle',
  {
    defaultMessage: 'query preview',
  }
);

export const QUERY_PREVIEW_NOISE_WARNING = i18n.translate(
  'xpack.securitySolution.detectionEngine.queryPreview.queryGraphPreviewNoiseWarning',
  {
    defaultMessage:
      'Noise warning: This rule may cause a lot of noise. Consider narrowing your query. This is based on a linear progression of 1 alert per hour.',
  }
);

export const QUERY_PREVIEW_NO_HITS = i18n.translate(
  'xpack.securitySolution.detectionEngine.queryPreview.queryNoHits',
  {
    defaultMessage: 'No hits were found.',
  }
);

export const PREVIEW_QUERY_ERROR = i18n.translate(
  'xpack.securitySolution.detectionEngine.queryPreview.queryGraphPreviewError',
  {
    defaultMessage: 'Error fetching preview',
  }
);

export const PREVIEW_QUERY_DISCLAIMER = i18n.translate(
  'xpack.securitySolution.detectionEngine.queryPreview.queryGraphDisclaimer',
  {
    defaultMessage:
      'Note: This preview excludes effects of rule exceptions and timestamp overrides.',
  }
);

export const PREVIEW_QUERY_DISCLAIMER_EQL = i18n.translate(
  'xpack.securitySolution.detectionEngine.queryPreview.queryGraphDisclaimerEql',
  {
    defaultMessage:
      'Note: This preview excludes effects of rule exceptions and timestamp overrides, and is limited to 100 results.',
  }
);

export const PREVIEW_WARNING_CAP_HIT = (cap: number) =>
  i18n.translate(
    'xpack.securitySolution.detectionEngine.queryPreview.queryPreviewGraphCapHitWarning',
    {
      values: { cap },
      defaultMessage:
        'Hit query cap size of {cap}. This query could produce more hits than the {cap} shown.',
    }
  );

export const PREVIEW_WARNING_TIMESTAMP = i18n.translate(
  'xpack.securitySolution.detectionEngine.queryPreview.queryPreviewGraphTimestampWarning',
  {
    defaultMessage: 'Unable to find "@timestamp" field on events.',
  }
);

export const PREVIEW_SUBTITLE_LOADING = i18n.translate(
  'xpack.securitySolution.detectionEngine.queryPreview.queryPreviewSubtitleLoading',
  {
    defaultMessage: '...loading',
  }
);
