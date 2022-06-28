/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export enum ActionType {
  SCHEDULE_TASK = 'schedule-task',
  CLAIM_TASK = 'claim-task',
  EXECUTE_START = 'execute-start',
  EXECUTE_COMPLETE = 'execute-complete',
  SAVE_REPORT = 'save-report',
  RETRY = 'retry',
  FAIL_REPORT = 'fail-report',
  EXECUTE_ERROR = 'execute-error',
}
