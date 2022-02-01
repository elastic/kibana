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
        kibana: {
          task: {
            schedule_delay: 13980000000,
          },
          alert: {
            rule: {
              execution: {
                metrics: {
                  total_alerts: 0,
                  total_hits: 0,
                  total_indexing_duration_ms: 0,
                  total_search_duration_ms: 9,
                },
                status: 'succeeded',
              },
            },
          },
        },
        event: {
          duration: 2065000000,
        },
        message: 'succeeded',
        '@timestamp': '2022-02-01T05:51:27.143Z',
      },
    ],
    maxEvents: 1,
  });
};

export const fetchTags = async ({ signal }: { signal: AbortSignal }): Promise<string[]> =>
  Promise.resolve(['elastic', 'love', 'quality', 'code']);
