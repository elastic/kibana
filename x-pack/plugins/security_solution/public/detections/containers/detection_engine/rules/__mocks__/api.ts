/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  GetAggregateRuleExecutionEventsResponse,
  RulesSchema,
} from '../../../../../../common/detection_engine/schemas/response';

import { getRulesSchemaMock } from '../../../../../../common/detection_engine/schemas/response/rules_schema.mocks';
import { savedRuleMock, rulesMock } from '../mock';

import {
  PatchRuleProps,
  CreateRulesProps,
  UpdateRulesProps,
  PrePackagedRulesStatusResponse,
  BasicFetchProps,
  Rule,
  FetchRuleProps,
  FetchRulesResponse,
  FetchRulesProps,
} from '../types';

export const updateRule = async ({ rule, signal }: UpdateRulesProps): Promise<RulesSchema> =>
  Promise.resolve(getRulesSchemaMock());

export const createRule = async ({ rule, signal }: CreateRulesProps): Promise<RulesSchema> =>
  Promise.resolve(getRulesSchemaMock());

export const patchRule = async ({ ruleProperties, signal }: PatchRuleProps): Promise<RulesSchema> =>
  Promise.resolve(getRulesSchemaMock());

export const getPrePackagedRulesStatus = async ({
  signal,
}: {
  signal: AbortSignal;
}): Promise<PrePackagedRulesStatusResponse> =>
  Promise.resolve({
    rules_custom_installed: 33,
    rules_installed: 12,
    rules_not_installed: 0,
    rules_not_updated: 0,
    timelines_installed: 0,
    timelines_not_installed: 0,
    timelines_not_updated: 0,
  });

export const createPrepackagedRules = async ({ signal }: BasicFetchProps): Promise<boolean> =>
  Promise.resolve(true);

export const fetchRuleById = jest.fn(
  async ({ id, signal }: FetchRuleProps): Promise<Rule> => savedRuleMock
);

export const fetchRules = async (_: FetchRulesProps): Promise<FetchRulesResponse> =>
  Promise.resolve(rulesMock);

export const fetchRuleExecutionEvents = async ({
  ruleId,
  start,
  end,
  filters,
  signal,
}: {
  ruleId: string;
  start: string;
  end: string;
  filters?: string;
  signal?: AbortSignal;
}): Promise<GetAggregateRuleExecutionEventsResponse> => {
  return Promise.resolve({
    events: [
      {
        duration_ms: 3866,
        es_search_duration_ms: 1236,
        execution_uuid: '88d15095-7937-462c-8f21-9763e1387cad',
        gap_duration_ms: 0,
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
  });
};

export const fetchTags = async ({ signal }: { signal: AbortSignal }): Promise<string[]> =>
  Promise.resolve(['elastic', 'love', 'quality', 'code']);
