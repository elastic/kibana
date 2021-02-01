/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ANALYSIS_CONFIG_TYPE } from './analytics';

import { AnalyticsJobType } from '../pages/analytics_management/hooks/use_create_analytics_form/state';

import { LEGEND_TYPES } from '../../components/scatterplot_matrix/scatterplot_matrix_vega_lite_spec';

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
