/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IEventLogService } from '@kbn/event-log-plugin/server';
import { RuleExecutionEventType } from '../../../../../../common/api/detection_engine/rule_monitoring';
import { RULE_EXECUTION_LOG_PROVIDER } from './event_log_constants';

export const registerEventLogProvider = (eventLogService: IEventLogService) => {
  eventLogService.registerProviderActions(
    RULE_EXECUTION_LOG_PROVIDER,
    RuleExecutionEventType.options
  );
};
