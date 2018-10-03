/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */



// Thresholds for indicating the impact of multi-bucket features in an anomaly.
export const MULTI_BUCKET_IMPACT = {
  HIGH: 4,
  MEDIUM: 3,
  LOW: 1,
  NONE: -5
};
