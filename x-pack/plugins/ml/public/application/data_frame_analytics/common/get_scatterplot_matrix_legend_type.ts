/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ANALYSIS_CONFIG_TYPE } from '@kbn/ml-data-frame-analytics-utils';

import type { AnalyticsJobType } from '../pages/analytics_management/hooks/use_create_analytics_form/state';

import { LEGEND_TYPES } from '../../components/vega_chart/common';

export const getScatterplotMatrixLegendType = (jobType: AnalyticsJobType | 'unknown') => {
  switch (jobType) {
    case ANALYSIS_CONFIG_TYPE.CLASSIFICATION:
      return LEGEND_TYPES.NOMINAL;
    case ANALYSIS_CONFIG_TYPE.REGRESSION:
      return LEGEND_TYPES.QUANTITATIVE;
    default:
      return undefined;
  }
};
