/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Duration } from 'moment';
import { RuleExecutionStatus } from '../../../../../common/detection_engine/schemas/common';

/**
 * Used from rule executors to log various information about the rule execution:
 *   - rule status changes
 *   - rule execution metrics
 *   - later - generic messages and any kind of info we'd need to log for rule
 *     monitoring or debugging purposes
 */
export interface IRuleExecutionLogForExecutors {
  context: RuleExecutionContext;

  /**
   * Writes information about new rule statuses and measured execution metrics:
   *   1. To .kibana-* index as a custom `siem-detection-engine-rule-execution-info` saved object.
   *      This SO is used for fast access to last execution info of a large amount of rules.
   *   2. To .kibana-event-log-* index in order to track history of rule executions.
   * @param args Information about the status change event.
   */
  logStatusChange(args: StatusChangeArgs): Promise<void>;
}

export interface RuleExecutionContext {
  executionId: string;
  ruleId: string;
  ruleName: string;
  ruleType: string;
  spaceId: string;
}

export interface StatusChangeArgs {
  newStatus: RuleExecutionStatus;
  message?: string;
  metrics?: MetricsArgs;
}

export interface MetricsArgs {
  searchDurations?: string[];
  indexingDurations?: string[];
  executionGap?: Duration;
}
