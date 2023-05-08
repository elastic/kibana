/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
export const TASK_MANAGER_INDEX = '.kibana_task_manager';
export const CONCURRENCY_ALLOW_LIST_BY_TASK_TYPE: string[] = [
  // for testing
  'sampleTaskWithSingleConcurrency',
  'sampleTaskWithLimitedConcurrency',
  'timedTaskWithSingleConcurrency',
  'timedTaskWithLimitedConcurrency',

  // task types requiring a concurrency
  'report:execute',

  // task types not requiring a concurrency
  'actions:.email',
  'actions:.index',
  'actions:.pagerduty',
  'actions:.swimlane',
  'actions:.server-log',
  'actions:.slack',
  'actions:.slack_api',
  'actions:.webhook',
  'actions:.cases-webhook',
  'actions:.xmatters',
  'actions:.servicenow',
  'actions:.servicenow-sir',
  'actions:.servicenow-itom',
  'actions:.jira',
  'actions:.resilient',
  'actions:.teams',
  'actions:.torq',
  'actions:.opsgenie',
  'actions:.tines',
];
