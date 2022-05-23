/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act } from '@testing-library/react-hooks';
import { useLoadRuleAggregations } from './use_load_rule_aggregations';
import { RuleStatus } from '../../types';

const MOCK_TAGS = ['a', 'b', 'c'];

const MOCK_AGGS = {
  ruleEnabledStatus: { enabled: 2, disabled: 0 },
  ruleExecutionStatus: { ok: 1, active: 2, error: 3, pending: 4, unknown: 5, warning: 6 },
  ruleMutedStatus: { muted: 0, unmuted: 2 },
  ruleTags: MOCK_TAGS,
};

jest.mock('../lib/rule_api', () => ({
  loadRuleAggregations: jest.fn(),
}));

const { loadRuleAggregations } = jest.requireMock('../lib/rule_api');

const onError = jest.fn();

describe('useLoadRuleAggregations', () => {
  beforeEach(() => {
    loadRuleAggregations.mockResolvedValue(MOCK_AGGS);
    jest.clearAllMocks();
  });

  it('should call loadRuleAggregations API and handle result', async () => {
    const params = {
      searchText: '',
      typesFilter: [],
      actionTypesFilter: [],
      ruleExecutionStatusesFilter: [],
      ruleStatusesFilter: [],
      tagsFilter: [],
    };

    const { result, waitForNextUpdate } = renderHook(() =>
      useLoadRuleAggregations({
        ...params,
        onError,
      })
    );

    await act(async () => {
      result.current.loadRuleAggregations();
      await waitForNextUpdate();
    });

    expect(loadRuleAggregations).toBeCalledWith(expect.objectContaining(params));
    expect(result.current.rulesStatusesTotal).toEqual(MOCK_AGGS.ruleExecutionStatus);
  });

  it('should call loadRuleAggregation API with params and handle result', async () => {
    const params = {
      searchText: 'test',
      typesFilter: ['type1', 'type2'],
      actionTypesFilter: ['action1', 'action2'],
      ruleExecutionStatusesFilter: ['status1', 'status2'],
      ruleStatusesFilter: ['enabled', 'snoozed'] as RuleStatus[],
      tagsFilter: ['tag1', 'tag2'],
    };

    const { result, waitForNextUpdate } = renderHook(() =>
      useLoadRuleAggregations({
        ...params,
        onError,
      })
    );

    await act(async () => {
      result.current.loadRuleAggregations();
      await waitForNextUpdate();
    });

    expect(loadRuleAggregations).toBeCalledWith(expect.objectContaining(params));
    expect(result.current.rulesStatusesTotal).toEqual(MOCK_AGGS.ruleExecutionStatus);
  });

  it('should call onError if API fails', async () => {
    loadRuleAggregations.mockRejectedValue('');
    const params = {
      searchText: '',
      typesFilter: [],
      actionTypesFilter: [],
      ruleExecutionStatusesFilter: [],
      ruleStatusesFilter: [],
      tagsFilter: [],
    };

    const { result } = renderHook(() =>
      useLoadRuleAggregations({
        ...params,
        onError,
      })
    );

    await act(async () => {
      result.current.loadRuleAggregations();
    });

    expect(onError).toBeCalled();
  });
});
