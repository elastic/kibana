/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  LogEntryAnomaly,
  CategoryAnomaly,
} from '../http_api/log_analysis/results/log_entry_anomalies';

export const isCategoryAnomaly = (anomaly: LogEntryAnomaly): anomaly is CategoryAnomaly => {
  return anomaly.type === 'logCategory';
};
