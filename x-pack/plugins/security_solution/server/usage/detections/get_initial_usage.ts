/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DetectionMetrics } from './types';

import { getInitialMlJobUsage } from './ml_jobs/get_initial_usage';
import { getInitialRulesUsage } from './rules/get_initial_usage';

/**
 * Initial detection metrics initialized.
 */
export const getInitialDetectionMetrics = (): DetectionMetrics => ({
  ml_jobs: {
    ml_job_usage: getInitialMlJobUsage(),
    ml_job_metrics: [],
  },
  detection_rules: {
    detection_rule_detail: [],
    detection_rule_usage: getInitialRulesUsage(),
  },
});
