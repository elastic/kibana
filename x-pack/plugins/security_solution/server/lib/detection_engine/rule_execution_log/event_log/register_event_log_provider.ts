/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IEventLogService } from '../../../../../../event_log/server';
import { RuleExecutionLogAction, RULE_EXECUTION_LOG_PROVIDER } from './constants';

export const registerEventLogProvider = (eventLogService: IEventLogService) => {
  eventLogService.registerProviderActions(
    RULE_EXECUTION_LOG_PROVIDER,
    Object.keys(RuleExecutionLogAction)
  );
};
