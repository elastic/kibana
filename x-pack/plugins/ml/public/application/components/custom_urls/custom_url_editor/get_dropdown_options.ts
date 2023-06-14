/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DataView } from '@kbn/data-views-plugin/public';
import {
  isDataFrameAnalyticsConfigs,
  type DataFrameAnalyticsConfig,
} from '@kbn/ml-data-frame-analytics-utils';
import { Job, isAnomalyDetectionJob } from '../../../../../common/types/anomaly_detection_jobs';
import { getQueryEntityFieldNames, getSupportedFieldNames } from './utils';

export function getDropDownOptions(
  isFirstRender: boolean,
  job: Job | DataFrameAnalyticsConfig,
  dataView?: DataView
) {
  if (isAnomalyDetectionJob(job) && isFirstRender) {
    return getQueryEntityFieldNames(job);
  } else if ((isDataFrameAnalyticsConfigs(job) || !isFirstRender) && dataView !== undefined) {
    return getSupportedFieldNames(job, dataView);
  }
  return [];
}
