/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  GetRuleExecutionEventsResponse,
  GetRuleExecutionResultsResponse,
} from '../../../../../common/detection_engine/rule_monitoring';
import {
  LogLevel,
  RuleExecutionEventType,
} from '../../../../../common/detection_engine/rule_monitoring';

import type {
  FetchRuleExecutionEventsArgs,
  FetchRuleExecutionResultsArgs,
  IRuleMonitoringApiClient,
} from '../api_client_interface';

export const api: jest.Mocked<IRuleMonitoringApiClient> = {
  fetchRuleExecutionEvents: jest
    .fn<Promise<GetRuleExecutionEventsResponse>, [FetchRuleExecutionEventsArgs]>()
    .mockResolvedValue({
      events: [
        {
          timestamp: '2021-12-29T10:42:59.996Z',
          sequence: 0,
          level: LogLevel.info,
          type: RuleExecutionEventType['status-change'],
          message: 'Rule changed status to "succeeded". Rule execution completed without errors',
        },
      ],
      pagination: {
        page: 1,
        per_page: 20,
        total: 1,
      },
    }),

  fetchRuleExecutionResults: jest
    .fn<Promise<GetRuleExecutionResultsResponse>, [FetchRuleExecutionResultsArgs]>()
    .mockResolvedValue({
      events: [
        {
          duration_ms: 3866,
          es_search_duration_ms: 1236,
          execution_uuid: '88d15095-7937-462c-8f21-9763e1387cad',
          gap_duration_s: 0,
          indexing_duration_ms: 95,
          message:
            "rule executed: siem.queryRule:fb1fc150-a292-11ec-a2cf-c1b28b0392b0: 'Lots of Execution Events'",
          num_active_alerts: 0,
          num_errored_actions: 0,
          num_new_alerts: 0,
          num_recovered_alerts: 0,
          num_succeeded_actions: 1,
          num_triggered_actions: 1,
          schedule_delay_ms: -127535,
          search_duration_ms: 1255,
          security_message: 'succeeded',
          security_status: 'succeeded',
          status: 'success',
          timed_out: false,
          timestamp: '2022-03-13T06:04:05.838Z',
          total_search_duration_ms: 0,
        },
      ],
      total: 1,
    }),
};
