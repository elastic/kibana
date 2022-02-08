/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ml_jobs } from './detections/ml_jobs/schema';
import { detection_rules } from './detections/rules/schema';

export interface UsageData {
  detectionMetrics: {};
}

export const schema: UsageData = {
  detectionMetrics: {
    detection_rules,
    ml_jobs,
  },
};
