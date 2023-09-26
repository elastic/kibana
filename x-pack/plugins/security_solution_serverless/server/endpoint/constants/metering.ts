/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const METERING_TASK = {
  TITLE: 'Serverless Endpoint Usage Metering Task',
  TYPE: 'serverless-security:endpoint-usage-reporting-task',
  VERSION: '1.0.0',
  INTERVAL: '5m',
  // 1 hour
  SAMPLE_PERIOD_SECONDS: 3600,
  THRESHOLD_MINUTES: 30,
  USAGE_TYPE_PREFIX: 'security_solution_',
  MISSING_PROJECT_ID: 'missing_project_id',
  // 3x of interval
  LOOK_BACK_LIMIT_MINUTES: 15,
};
