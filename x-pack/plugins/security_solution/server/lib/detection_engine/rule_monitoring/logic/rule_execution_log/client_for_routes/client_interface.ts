/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  GetRuleExecutionEventsResponse,
  GetRuleExecutionResultsResponse,
  LogLevel,
  RuleExecutionEventType,
  RuleExecutionStatus,
  SortFieldOfRuleExecutionResult,
  RuleRunType,
} from '../../../../../../../common/api/detection_engine/rule_monitoring';
import type { RuleObjectId } from '../../../../../../../common/api/detection_engine/model/rule_schema';
import type { SortOrder } from '../../../../../../../common/api/detection_engine';

/**
 * Used from route handlers to fetch and manage various information about the rule execution:
 *   - execution summary of a rule containing such data as the last status and metrics
 *   - execution events such as recent failures and status changes
 */
export interface IRuleExecutionLogForRoutes {
  /**
   * Fetches plain execution events of a given rule from Event Log. This includes debug, info, and
   * error messages that executor functions write during a rule execution to the log.
   */
  getExecutionEvents(args: GetExecutionEventsArgs): Promise<GetRuleExecutionEventsResponse>;

  /**
   * Fetches execution results aggregated by execution UUID, combining data from both alerting
   * and security-solution event-log documents.
   */
  getExecutionResults(args: GetExecutionResultsArgs): Promise<GetRuleExecutionResultsResponse>;
}

export interface GetExecutionEventsArgs {
  /** Saved object id of the rule (`rule.id`). */
  ruleId: RuleObjectId;

  /** Include events of matching the search term. If omitted, all events will be included. */
  searchTerm?: string;

  /** Include events of the specified types. If omitted, all types of events will be included. */
  eventTypes?: RuleExecutionEventType[];

  /** Include events having these log levels. If omitted, events of all levels will be included. */
  logLevels?: LogLevel[];

  /** Include events recorded starting from the specified moment. If omitted, all events will be included. */
  dateStart?: string;

  /** Include events recorded till the specified moment. If omitted, all events will be included. */
  dateEnd?: string;

  /** What order to sort by (e.g. `asc` or `desc`). */
  sortOrder: SortOrder;

  /** Current page to fetch. */
  page: number;

  /** Number of results to fetch per page. */
  perPage: number;
}

export interface GetExecutionResultsArgs {
  /** Saved object id of the rule (`rule.id`). */
  ruleId: RuleObjectId;

  /** Start of daterange to filter to. */
  start: string;

  /** End of daterange to filter to. */
  end: string;

  /** String of field-based filters, e.g. kibana.alert.rule.execution.status:* */
  queryText: string;

  /** Array of status filters, e.g. ['succeeded', 'going to run'] */
  statusFilters: RuleExecutionStatus[];

  /** Field to sort by. */
  sortField: SortFieldOfRuleExecutionResult;

  /** What order to sort by (e.g. `asc` or `desc`). */
  sortOrder: SortOrder;

  /** Current page to fetch. */
  page: number;

  /** Number of results to fetch per page. */
  perPage: number;

  runTypeFilters: RuleRunType[];
}
