/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, renderHook } from '@testing-library/react-hooks';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import {
  useChangeCspRuleState,
  createRulesWithUpdatedState,
  RuleStateUpdateRequest,
} from './use_change_csp_rule_state';
import { RuleStateAttributes } from '../../../common/types/rules/v4';
import React from 'react';
import { BENCHMARK_INTEGRATION_QUERY_KEY_V2 } from '../benchmarks/use_csp_benchmark_integrations';
import { CSPM_STATS_QUERY_KEY, KSPM_STATS_QUERY_KEY } from '../../common/api';
import { CSP_RULES_STATES_QUERY_KEY } from './use_csp_rules_state';

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
    logger: {
      log: jest.fn(),
      warn: jest.fn(),
      error: () => {},
    },
  });

  const wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  return { wrapper, queryClient };
};

describe('use_change_csp_rule_state', () => {
  const mockHttp = useKibana().services.http;

  let appMockRender: {
    wrapper: React.FC<{
      children: React.ReactNode;
    }>;
    queryClient: QueryClient;
  };

  beforeEach(() => {
    appMockRender = testWrapper();
    jest.clearAllMocks();
  });

  it('should cancel queries and update query data onMutate', async () => {
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
          rule_id: 'ruleId1',
        },
      ],
    };

    act(() => {
      result.current.mutate(mockRuleStateUpdateRequest);
    });

    await waitForNextUpdate();

    expect(queryClientSpy).toHaveBeenCalled();
    expect(queryClientGetSpy).toHaveBeenCalled();
    expect(mockSetQueryDataSpy).toHaveBeenCalled();
  });

  it('should invalidate queries onSettled', async () => {
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
          rule_id: 'ruleId1',
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
    const mockSetQueryDataSpy = jest.spyOn(appMockRender.queryClient, 'setQueryData');

    const { result, waitForNextUpdate } = await renderHook(() => useChangeCspRuleState(), {
      wrapper: appMockRender.wrapper,
    });

    const mockRuleStateUpdateRequest = {
      newState: 'mute',
      badData: [
        {
          benchmark_id: 'benchmark_id',
          benchmark_version: 'benchmark_version',
          rule_number: '1',
          rule_id: 'ruleId1',
        },
      ],
    };

    act(() => {
      // @ts-expect-error  because we are injecting an error
      result.current.mutate(mockRuleStateUpdateRequest);
    });

    await waitForNextUpdate();

    expect(mockSetQueryDataSpy).toHaveBeenCalled();
  });

  it('creates the new cache with rules in a muted state when calling createRulesWithUpdatedState', async () => {
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

    const currentData: Record<string, RuleStateAttributes> = {
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

    const newRulesState = createRulesWithUpdatedState(request, currentData);
    expect(newRulesState).toEqual({ ...currentData, ...updateRules });
  });

  it('creates the new cache with rules in a unmute state', async () => {
    const currentData: Record<string, RuleStateAttributes> = {
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

    const newRulesState = createRulesWithUpdatedState(request, currentData);
    expect(newRulesState).toEqual({ ...currentData, ...updateRules });
  });
});
