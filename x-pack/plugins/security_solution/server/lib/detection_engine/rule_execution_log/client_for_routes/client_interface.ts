/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import {
  ExecutionLogTableSortColumns,
  RuleExecutionEvent,
  RuleExecutionStatus,
  RuleExecutionSummary,
} from '../../../../../common/detection_engine/schemas/common';
import { GetAggregateRuleExecutionEventsResponse } from '../../../../../common/detection_engine/schemas/response';

export interface GetAggregateExecutionEventsArgs {
  ruleId: string;
  start: string;
  end: string;
  queryText: string;
  statusFilters: RuleExecutionStatus[];
  page: number;
  perPage: number;
  sortField: ExecutionLogTableSortColumns;
  sortOrder: estypes.SortOrder;
}

/**
 * Used from route handlers to fetch and manage various information about the rule execution:
 *   - execution summary of a rule containing such data as the last status and metrics
 *   - execution events such as recent failures and status changes
 */
export interface IRuleExecutionLogForRoutes {
  /**
   * Fetches list of execution events aggregated by executionId, combining data from both alerting
   * and security-solution event-log documents
   * @param ruleId Saved object id of the rule (`rule.id`).
   * @param start start of daterange to filter to
   * @param end end of daterange to filter to
   * @param queryText string of field-based filters, e.g.  kibana.alert.rule.execution.status:*
   * @param statusFilters array of status filters, e.g.  ['succeeded', 'going to run']
   * @param page current page to fetch
   * @param perPage number of results to fetch per page
   * @param sortField field to sort by
   * @param sortOrder what order to sort by (e.g. `asc` or `desc`)
   */
  getAggregateExecutionEvents({
    ruleId,
    start,
    end,
    queryText,
    statusFilters,
    page,
    perPage,
    sortField,
    sortOrder,
  }: GetAggregateExecutionEventsArgs): Promise<GetAggregateRuleExecutionEventsResponse>;

  /**
   * Fetches a list of current execution summaries of multiple rules.
   * @param ruleIds A list of saved object ids of multiple rules (`rule.id`).
   */
  getExecutionSummariesBulk(ruleIds: string[]): Promise<RuleExecutionSummariesByRuleId>;

  /**
   * Fetches current execution summary of a given rule.
   * @param ruleId Saved object id of the rule (`rule.id`).
   */
  getExecutionSummary(ruleId: string): Promise<RuleExecutionSummary | null>;

  /**
   * Deletes the current execution summary if it exists.
   * @param ruleId Saved object id of the rule (`rule.id`).
   */
  clearExecutionSummary(ruleId: string): Promise<void>;

  /**
   * Fetches last 5 failures (`RuleExecutionStatus.failed`) of a given rule.
   * @param ruleId Saved object id of the rule (`rule.id`).
   * @deprecated Will be replaced with a more flexible method for fetching execution events.
   */
  getLastFailures(ruleId: string): Promise<RuleExecutionEvent[]>;
}

export type RuleExecutionSummariesByRuleId = Record<string, RuleExecutionSummary | null>;
