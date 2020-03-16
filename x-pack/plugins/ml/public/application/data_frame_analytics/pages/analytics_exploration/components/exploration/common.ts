/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { DataFrameAnalyticsConfig } from '../../../../common';

const OUTLIER_SCORE = 'outlier_score';

export const getOutlierScoreFieldName = (jobConfig: DataFrameAnalyticsConfig) =>
  `${jobConfig.dest.results_field}.${OUTLIER_SCORE}`;
