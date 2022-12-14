/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const ERROR_LOADING_STATS_TITLE = i18n.translate(
  'xpack.securitySolution.dataQuality.emptyErrorPrompt.errorLoadingStatsTitle',
  {
    defaultMessage: 'Unable to load stats',
  }
);

export const ERROR_LOADING_STATS_BODY = (error: string) =>
  i18n.translate('xpack.securitySolution.dataQuality.emptyErrorPrompt.errorLoadingStatsBody', {
    values: { error },
    defaultMessage: 'There was a problem loading stats: {error}',
  });

export const LOADING_STATS = i18n.translate(
  'xpack.securitySolution.dataQuality.emptyLoadingPrompt.loadingStatsPrompt',
  {
    defaultMessage: 'Loading stats',
  }
);
