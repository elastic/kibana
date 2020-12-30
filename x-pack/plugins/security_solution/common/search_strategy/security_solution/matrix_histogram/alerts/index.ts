/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { HistogramBucket } from '../common';

export interface AlertsGroupData {
  key: string;
  doc_count: number;
  alerts: {
    buckets: HistogramBucket[];
  };
}
