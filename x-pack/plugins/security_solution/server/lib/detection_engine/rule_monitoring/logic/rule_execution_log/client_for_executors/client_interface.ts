/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Duration } from 'moment';
import type {
  RuleExecutionStatus,
  RuleExecutionStatusEnum,
} from '../../../../../../../common/api/detection_engine/rule_monitoring';

/**
 * Used from rule executors to log various information about the rule execution:
 *   - rule status changes
 *   - rule execution metrics
 *   - generic logs with debug/info/warning messages and errors
 *
 * Write targets: console logs, Event Log, saved objects.
 *
 * We create a new instance of this interface per each rule execution.
 */
export interface IRuleExecutionLogForExecutors {
  /**
   * Context with correlation ids and data related to the current rule execution.
   */
  context: RuleExecutionContext;

  /**
   * Writes a trace message to console logs.
   * If enabled, writes it to .kibana-event-log-* index as well.
   */
  trace(...messages: string[]): void;

  /**
   * Writes a debug message to console logs.
   * If enabled, writes it to .kibana-event-log-* index as well.
   */
  debug(...messages: string[]): void;

  /**
   * Writes an info message to console logs.
   * If enabled, writes it to .kibana-event-log-* index as well.
   */
  info(...messages: string[]): void;

  /**
   * Writes a warning message to console logs.
   * If enabled, writes it to .kibana-event-log-* index as well.
   */
  warn(...messages: string[]): void;

  /**
   * Writes an error message to console logs.
   * If enabled, writes it to .kibana-event-log-* index as well.
   */
  error(...messages: string[]): void;

  /**
   * Writes information about new rule statuses and measured execution metrics:
   *   1. To .kibana-* index as a custom `siem-detection-engine-rule-execution-info` saved object.
   *      This SO is used for fast access to last execution info of a large amount of rules.
   *   2. To .kibana-event-log-* index in order to track history of rule executions.
   *   3. To console logs.
   * @param args Information about the status change event.
   */
  logStatusChange(args: StatusChangeArgs): Promise<void>;
}

/**
 * Each time a rule gets executed, we build an instance of rule execution context that
 * contains correlation ids and data common to this particular rule execution.
 */
export interface RuleExecutionContext {
  /**
   * Every execution of a rule executor gets assigned its own UUID at the Alerting Framework
   * level. We can use this id to filter all console logs, execution events in Event Log,
   * and detection alerts written during a particular rule execution.
   */
  executionId: string;

  /**
   * Dynamic, saved object id of the rule being executed (rule.id).
   */
  ruleId: string;

  /**
   * Static, global (or "signature") id of the rule being executed (rule.rule_id).
   */
  ruleUuid: string;

  /**
   * Name of the rule being executed.
   */
  ruleName: string;

  /**
   * Current revision of the rule being execution (rule.revision)
   */
  ruleRevision: number;

  /**
   * Alerting Framework's rule type id of the rule being executed.
   */
  ruleType: string;

  /**
   * Kibana space id of the rule being executed.
   */
  spaceId: string;
}

export interface RunningStatusChangeArgs {
  newStatus: RuleExecutionStatusEnum['running'];
}

/**
 * Information about the status change event.
 */
export interface StatusChangeArgs {
  newStatus: RuleExecutionStatus;
  message?: string;
  metrics?: MetricsArgs;
  userError?: boolean;
}

export interface MetricsArgs {
  searchDurations?: string[];
  indexingDurations?: string[];
  enrichmentDurations?: string[];
  executionGap?: Duration;
  gapRange?: { gte: string; lte: string };
}
