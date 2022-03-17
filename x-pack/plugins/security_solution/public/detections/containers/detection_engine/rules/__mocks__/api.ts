/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RuleExecutionStatus } from '../../../../../../common/detection_engine/schemas/common';
import {
  GetRuleExecutionEventsResponse,
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
  signal,
}: {
  ruleId: string;
  signal?: AbortSignal;
}): Promise<GetRuleExecutionEventsResponse> => {
  return Promise.resolve({
    events: [
      {
        date: '2021-12-29T10:42:59.996Z',
        status: RuleExecutionStatus.succeeded,
        message: 'Rule executed successfully',
      },
    ],
  });
};

export const fetchTags = async ({ signal }: { signal: AbortSignal }): Promise<string[]> =>
  Promise.resolve(['elastic', 'love', 'quality', 'code']);
