/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RuleExecutionStatus } from './execution_status';
import type { RuleExecutionSummary } from './execution_summary';

const getSummarySucceeded = (): RuleExecutionSummary => ({
  last_execution: {
    date: '2020-02-18T15:26:49.783Z',
    status: RuleExecutionStatus.succeeded,
    status_order: 0,
    message: 'succeeded',
    metrics: {
      total_search_duration_ms: 200,
      total_indexing_duration_ms: 800,
      execution_gap_duration_s: 500,
    },
  },
});

const getSummaryFailed = (): RuleExecutionSummary => ({
  last_execution: {
    date: '2020-02-18T15:15:58.806Z',
    status: RuleExecutionStatus.failed,
    status_order: 30,
    message:
      'Signal rule name: "Query with a rule id Number 1", id: "1ea5a820-4da1-4e82-92a1-2b43a7bece08", rule_id: "query-rule-id-1" has a time gap of 5 days (412682928ms), and could be missing signals within that time. Consider increasing your look behind time or adding more Kibana instances.',
    metrics: {
      total_search_duration_ms: 200,
      total_indexing_duration_ms: 800,
      execution_gap_duration_s: 500,
    },
  },
});

export const ruleExecutionSummaryMock = {
  getSummarySucceeded,
  getSummaryFailed,
};
