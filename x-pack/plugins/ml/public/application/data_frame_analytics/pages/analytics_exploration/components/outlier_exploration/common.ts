/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { DataGridItem } from '../../../../../components/data_grid';

import { DataFrameAnalyticsConfig } from '../../../../common';
import { FEATURE_INFLUENCE, OUTLIER_SCORE } from '../../../../common/constants';

export const getOutlierScoreFieldName = (jobConfig: DataFrameAnalyticsConfig) =>
  `${jobConfig.dest.results_field}.${OUTLIER_SCORE}`;

export const getFeatureCount = (resultsField: string, tableItems: DataGridItem[] = []) => {
  if (tableItems.length === 0) {
    return 0;
  }

  return Object.keys(tableItems[0]).filter((key) =>
    key.includes(`${resultsField}.${FEATURE_INFLUENCE}.`)
  ).length;
};
