/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { act, renderHook } from '@testing-library/react-hooks';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { RuleStateAttributes } from '@kbn/cloud-security-posture-common/schema/rules/v4';
import {
  useChangeCspRuleState,
  createRulesWithUpdatedState,
  RuleStateUpdateRequest,
} from './use_change_csp_rule_state';
import { CSP_RULES_STATES_QUERY_KEY } from './use_csp_rules_state';
import { BENCHMARK_INTEGRATION_QUERY_KEY_V2 } from '../benchmarks/use_csp_benchmark_integrations';
import { CSPM_STATS_QUERY_KEY, KSPM_STATS_QUERY_KEY } from '../../common/api';
import { CSP_BENCHMARK_RULES_BULK_ACTION_ROUTE_PATH } from '../../../common/constants';

const initialRules = {
  rule_1: {
    benchmark_id: 'benchmark_id',
    benchmark_version: 'benchmark_version',
    rule_number: '1',
    rule_id: 'rule_1',
    muted: false,
  },
  rule_2: {
    benchmark_id: 'benchmark_id',
    benchmark_version: 'benchmark_version',
    rule_number: '2',
    rule_id: 'rule_2',
    muted: false,
  },
  rule_3: {
    benchmark_id: 'benchmark_id',
    benchmark_version: 'benchmark_version',
    rule_number: '3',
    rule_id: 'rule_3',
    muted: false,
  },
};

jest.mock('@kbn/kibana-react-plugin/public', () => ({
  useKibana: jest.fn().mockReturnValue({
    services: {
      http: {
        post: jest.fn(),
      },
    },
  }),
}));

const testWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
    // this is needed to avoid the errors in the console that are cause by QueryClient`
    logger: {
      log: jest.fn(),
      warn: jest.fn(),
      error: () => {},
    },
  });

  queryClient.setQueryData(CSP_RULES_STATES_QUERY_KEY, { ...initialRules });

  return {
    wrapper: ({ children }: { children: React.ReactNode | React.ReactNode[] }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    ),
    queryClient,
  };
};

describe('use_change_csp_rule_state', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should call http.post with the correct parameters', async () => {
    const appMockRender = testWrapper();
    const httpPostSpy = jest.spyOn(useKibana().services.http!, 'post');

    const { result, waitForNextUpdate } = await renderHook(() => useChangeCspRuleState(), {
      wrapper: appMockRender.wrapper,
    });

    const mockRuleStateUpdateRequest: RuleStateUpdateRequest = {
      newState: 'mute',
      ruleIds: [
        {
          benchmark_id: 'benchmark_id',
          benchmark_version: 'benchmark_version',
          rule_number: '1',
          rule_id: 'rule_1',
        },
      ],
    };

    act(() => {
      result.current.mutate(mockRuleStateUpdateRequest);
    });

    await waitForNextUpdate();

    expect(httpPostSpy).toHaveBeenCalledWith(CSP_BENCHMARK_RULES_BULK_ACTION_ROUTE_PATH, {
      version: '1',
      body: JSON.stringify({
        action: 'mute',
        rules: [
          {
            benchmark_id: 'benchmark_id',
            benchmark_version: 'benchmark_version',
            rule_number: '1',
            rule_id: 'rule_1',
          },
        ],
      }),
    });
  });

  it('should cancel queries and update query data onMutate', async () => {
    const appMockRender = testWrapper();
    const queryClientSpy = jest.spyOn(appMockRender.queryClient, 'cancelQueries');
    const queryClientGetSpy = jest.spyOn(appMockRender.queryClient, 'getQueryData');
    const mockSetQueryDataSpy = jest.spyOn(appMockRender.queryClient, 'setQueryData');

    const { result, waitForNextUpdate } = await renderHook(() => useChangeCspRuleState(), {
      wrapper: appMockRender.wrapper,
    });

    const mockRuleStateUpdateRequest: RuleStateUpdateRequest = {
      newState: 'mute',
      ruleIds: [
        {
          benchmark_id: 'benchmark_id',
          benchmark_version: 'benchmark_version',
          rule_number: '1',
          rule_id: 'rule_1',
        },
      ],
    };

    act(() => {
      result.current.mutate(mockRuleStateUpdateRequest);
    });

    await waitForNextUpdate();

    const expectedMutatedRules = {
      ...initialRules,
      rule_1: { ...initialRules.rule_1, muted: true },
    };

    expect(queryClientSpy).toHaveBeenCalled();
    expect(queryClientGetSpy).toHaveBeenCalled();
    expect(mockSetQueryDataSpy).toHaveBeenCalled();
    expect(mockSetQueryDataSpy).toHaveReturnedWith(expectedMutatedRules);
  });

  it('should invalidate queries onSettled', async () => {
    const appMockRender = testWrapper();
    const mockInvalidateQueriesSpy = jest.spyOn(appMockRender.queryClient, 'invalidateQueries');

    const { result, waitForNextUpdate } = await renderHook(() => useChangeCspRuleState(), {
      wrapper: appMockRender.wrapper,
    });

    const mockRuleStateUpdateRequest: RuleStateUpdateRequest = {
      newState: 'mute',
      ruleIds: [
        {
          benchmark_id: 'benchmark_id',
          benchmark_version: 'benchmark_version',
          rule_number: '1',
          rule_id: 'rule_1',
        },
      ],
    };

    act(() => {
      result.current.mutate(mockRuleStateUpdateRequest);
    });

    await waitForNextUpdate();

    expect(mockInvalidateQueriesSpy).toHaveBeenCalledWith(BENCHMARK_INTEGRATION_QUERY_KEY_V2);
    expect(mockInvalidateQueriesSpy).toHaveBeenCalledWith(CSPM_STATS_QUERY_KEY);
    expect(mockInvalidateQueriesSpy).toHaveBeenCalledWith(KSPM_STATS_QUERY_KEY);
    expect(mockInvalidateQueriesSpy).toHaveBeenCalledWith(CSP_RULES_STATES_QUERY_KEY);
  });

  it('should restore previous query data onError', async () => {
    const appMockRender = testWrapper();
    const mockSetQueryDataSpy = jest.spyOn(appMockRender.queryClient, 'setQueryData');

    const { result, waitForNextUpdate } = await renderHook(() => useChangeCspRuleState(), {
      wrapper: appMockRender.wrapper,
    });

    const mockRuleStateUpdateRequest: RuleStateUpdateRequest = {
      newState: 'mute',
      ruleIds: [
        {
          benchmark_id: 'benchmark_id',
          benchmark_version: 'benchmark_version',
          rule_number: '1',
          // forcing an error by providing a ruleId that does not exist in the cache
          rule_id: 'shouldnotexist',
        },
      ],
    };

    act(() => {
      result.current.mutate(mockRuleStateUpdateRequest);
    });

    await waitForNextUpdate();

    expect(mockSetQueryDataSpy).toHaveBeenCalled();
    expect(mockSetQueryDataSpy).toHaveReturnedWith(initialRules);
  });

  it('creates the new set of cache rules in a muted state when calling createRulesWithUpdatedState', async () => {
    const request: RuleStateUpdateRequest = {
      newState: 'mute',
      ruleIds: [
        {
          benchmark_id: 'benchmark_id',
          benchmark_version: 'benchmark_version',
          rule_number: '1',
          rule_id: 'rule_1',
        },
        {
          benchmark_id: 'benchmark_id',
          benchmark_version: 'benchmark_version',
          rule_number: '2',
          rule_id: 'rule_2',
        },
      ],
    };

    const updateRules: Record<string, RuleStateAttributes> = {
      rule_1: {
        benchmark_id: 'benchmark_id',
        benchmark_version: 'benchmark_version',
        rule_number: '1',
        rule_id: 'rule_1',
        muted: true,
      },
      rule_2: {
        benchmark_id: 'benchmark_id',
        benchmark_version: 'benchmark_version',
        rule_number: '2',
        rule_id: 'rule_2',
        muted: true,
      },
    };

    const newRulesState = createRulesWithUpdatedState(request, initialRules);
    expect(newRulesState).toEqual({ ...initialRules, ...updateRules });
  });

  it('creates the new cache with rules in a unmute state', async () => {
    const initialMutedRules: Record<string, RuleStateAttributes> = {
      rule_1: {
        benchmark_id: 'benchmark_id',
        benchmark_version: 'benchmark_version',
        rule_number: '1',
        rule_id: 'rule_1',
        muted: true,
      },
      rule_2: {
        benchmark_id: 'benchmark_id',
        benchmark_version: 'benchmark_version',
        rule_number: '2',
        rule_id: 'rule_2',
        muted: true,
      },
      rule_3: {
        benchmark_id: 'benchmark_id',
        benchmark_version: 'benchmark_version',
        rule_number: '3',
        rule_id: 'rule_3',
        muted: false,
      },
    };

    const request: RuleStateUpdateRequest = {
      newState: 'unmute',
      ruleIds: [
        {
          benchmark_id: 'benchmark_id',
          benchmark_version: 'benchmark_version',
          rule_number: '1',
          rule_id: 'rule_1',
        },
        {
          benchmark_id: 'benchmark_id',
          benchmark_version: 'benchmark_version',
          rule_number: '2',
          rule_id: 'rule_2',
        },
      ],
    };

    const updateRules: Record<string, RuleStateAttributes> = {
      rule_1: {
        benchmark_id: 'benchmark_id',
        benchmark_version: 'benchmark_version',
        rule_number: '1',
        rule_id: 'rule_1',
        muted: false,
      },
      rule_2: {
        benchmark_id: 'benchmark_id',
        benchmark_version: 'benchmark_version',
        rule_number: '2',
        rule_id: 'rule_2',
        muted: false,
      },
    };

    const newRulesState = createRulesWithUpdatedState(request, initialMutedRules);
    expect(newRulesState).toEqual({ ...initialMutedRules, ...updateRules });
  });
});
