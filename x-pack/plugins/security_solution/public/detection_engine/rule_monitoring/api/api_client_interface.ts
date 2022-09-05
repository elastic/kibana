/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SortOrder } from '../../../../common/detection_engine/schemas/common';
import type {
  GetRuleExecutionEventsResponse,
  GetRuleExecutionResultsResponse,
  LogLevel,
  RuleExecutionEventType,
  RuleExecutionResult,
  RuleExecutionStatus,
} from '../../../../common/detection_engine/rule_monitoring';

export interface IRuleMonitoringApiClient {
  /**
   * Fetches plain rule execution events (status changes, metrics, generic events) from Event Log.
   * @throws An error if response is not OK.
   */
  fetchRuleExecutionEvents(
    args: FetchRuleExecutionEventsArgs
  ): Promise<GetRuleExecutionEventsResponse>;

  /**
   * Fetches aggregated rule execution results (events grouped by execution UUID) from Event Log.
   * @throws An error if response is not OK.
   */
  fetchRuleExecutionResults(
    args: FetchRuleExecutionResultsArgs
  ): Promise<GetRuleExecutionResultsResponse>;
}

export interface FetchRuleExecutionEventsArgs {
  /**
   * Saved Object ID of the rule (`rule.id`, not static `rule.rule_id`).
   */
  ruleId: string;

  /**
   * Filter by event type. If set, result will include only events matching any of these.
   */
  eventTypes?: RuleExecutionEventType[];

  /**
   * Filter by log level. If set, result will include only events matching any of these.
   */
  logLevels?: LogLevel[];

  /**
   * What order to sort by (e.g. `asc` or `desc`).
   */
  sortOrder?: SortOrder;

  /**
   * Current page to fetch.
   */
  page?: number;

  /**
   * Number of results to fetch per page.
   */
  perPage?: number;

  /**
   * Optional signal for cancelling the request.
   */
  signal?: AbortSignal;
}

export interface FetchRuleExecutionResultsArgs {
  /**
   * Saved Object ID of the rule (`rule.id`, not static `rule.rule_id`).
   */
  ruleId: string;

  /**
   * Start daterange either in UTC ISO8601 or as datemath string (e.g. `2021-12-29T02:44:41.653Z` or `now-30`).
   */
  start: string;

  /**
   * End daterange either in UTC ISO8601 or as datemath string (e.g. `2021-12-29T02:44:41.653Z` or `now/w`).
   */
  end: string;

  /**
   * Search string in querystring format, e.g.
   * `event.duration > 1000 OR kibana.alert.rule.execution.metrics.execution_gap_duration_s > 100`.
   */
  queryText?: string;

  /**
   * Array of `statusFilters` (e.g. `succeeded,failed,partial failure`).
   */
  statusFilters?: RuleExecutionStatus[];

  /**
   * Keyof AggregateRuleExecutionEvent field to sort by.
   */
  sortField?: keyof RuleExecutionResult;

  /**
   * What order to sort by (e.g. `asc` or `desc`).
   */
  sortOrder?: SortOrder;

  /**
   * Current page to fetch.
   */
  page?: number;

  /**
   * Number of results to fetch per page.
   */
  perPage?: number;

  /**
   * Optional signal for cancelling the request.
   */
  signal?: AbortSignal;
}
