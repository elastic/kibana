/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IEventLogService } from '../../../../event_log/server';
import { PLUGIN_ID } from '../../../common/constants';

export enum ActionType {
  SCHEDULE_TASK = 'schedule-task',
  CLAIM_TASK = 'claim-task',
  EXECUTE_START = 'execute-start',
  EXECUTE_COMPLETE = 'execute-complete',
  SAVE_REPORT = 'save-report',
  RETRY = 'retry',
  FAIL_REPORT = 'fail-report',
}
export function registerEventLogProviderActions(eventLog: IEventLogService) {
  eventLog.registerProviderActions(PLUGIN_ID, Object.values(ActionType));
}
