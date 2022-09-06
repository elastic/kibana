/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act } from '@testing-library/react-hooks';
import { useLoadRules } from './use_load_rules';
import {
  RuleExecutionStatusErrorReasons,
  RuleExecutionStatusWarningReasons,
} from '@kbn/alerting-plugin/common';
import { RuleStatus } from '../../types';

jest.mock('../lib/rule_api', () => ({
  loadRules: jest.fn(),
}));

const { loadRules } = jest.requireMock('../lib/rule_api');

const onError = jest.fn();
const onPage = jest.fn();

const mockedRulesData = [
  {
    id: '1',
    name: 'test rule',
    tags: ['tag1'],
    enabled: true,
    ruleTypeId: 'test_rule_type',
    schedule: { interval: '1s' },
    actions: [],
    params: { name: 'test rule type name' },
    scheduledTaskId: null,
    createdBy: null,
    updatedBy: null,
    apiKeyOwner: null,
    throttle: '1m',
    muteAll: false,
    mutedInstanceIds: [],
    executionStatus: {
      status: 'active',
      lastDuration: 500,
      lastExecutionDate: new Date('2020-08-20T19:23:38Z'),
      error: null,
    },
    monitoring: {
      execution: {
        history: [
          {
            success: true,
            duration: 1000000,
          },
          {
            success: true,
            duration: 200000,
          },
          {
            success: false,
            duration: 300000,
          },
        ],
        calculated_metrics: {
          success_ratio: 0.66,
          p50: 200000,
          p95: 300000,
          p99: 300000,
        },
      },
    },
  },
  {
    id: '2',
    name: 'test rule ok',
    tags: ['tag1'],
    enabled: true,
    ruleTypeId: 'test_rule_type',
    schedule: { interval: '5d' },
    actions: [],
    params: { name: 'test rule type name' },
    scheduledTaskId: null,
    createdBy: null,
    updatedBy: null,
    apiKeyOwner: null,
    throttle: '1m',
    muteAll: false,
    mutedInstanceIds: [],
    executionStatus: {
      status: 'ok',
      lastDuration: 61000,
      lastExecutionDate: new Date('2020-08-20T19:23:38Z'),
      error: null,
    },
    monitoring: {
      execution: {
        history: [
          {
            success: true,
            duration: 100000,
          },
          {
            success: true,
            duration: 500000,
          },
        ],
        calculated_metrics: {
          success_ratio: 1,
          p50: 0,
          p95: 100000,
          p99: 500000,
        },
      },
    },
  },
  {
    id: '3',
    name: 'test rule pending',
    tags: ['tag1'],
    enabled: true,
    ruleTypeId: 'test_rule_type',
    schedule: { interval: '5d' },
    actions: [],
    params: { name: 'test rule type name' },
    scheduledTaskId: null,
    createdBy: null,
    updatedBy: null,
    apiKeyOwner: null,
    throttle: '1m',
    muteAll: false,
    mutedInstanceIds: [],
    executionStatus: {
      status: 'pending',
      lastDuration: 30234,
      lastExecutionDate: new Date('2020-08-20T19:23:38Z'),
      error: null,
    },
    monitoring: {
      execution: {
        history: [{ success: false, duration: 100 }],
        calculated_metrics: {
          success_ratio: 0,
        },
      },
    },
  },
  {
    id: '4',
    name: 'test rule error',
    tags: ['tag1'],
    enabled: true,
    ruleTypeId: 'test_rule_type',
    schedule: { interval: '5d' },
    actions: [{ id: 'test', group: 'rule', params: { message: 'test' } }],
    params: { name: 'test rule type name' },
    scheduledTaskId: null,
    createdBy: null,
    updatedBy: null,
    apiKeyOwner: null,
    throttle: '1m',
    muteAll: false,
    mutedInstanceIds: [],
    executionStatus: {
      status: 'error',
      lastDuration: 122000,
      lastExecutionDate: new Date('2020-08-20T19:23:38Z'),
      error: {
        reason: RuleExecutionStatusErrorReasons.Unknown,
        message: 'test',
      },
    },
  },
  {
    id: '5',
    name: 'test rule license error',
    tags: [],
    enabled: true,
    ruleTypeId: 'test_rule_type',
    schedule: { interval: '5d' },
    actions: [{ id: 'test', group: 'rule', params: { message: 'test' } }],
    params: { name: 'test rule type name' },
    scheduledTaskId: null,
    createdBy: null,
    updatedBy: null,
    apiKeyOwner: null,
    throttle: '1m',
    muteAll: false,
    mutedInstanceIds: [],
    executionStatus: {
      status: 'error',
      lastDuration: 500,
      lastExecutionDate: new Date('2020-08-20T19:23:38Z'),
      error: {
        reason: RuleExecutionStatusErrorReasons.License,
        message: 'test',
      },
    },
  },
  {
    id: '6',
    name: 'test rule warning',
    tags: [],
    enabled: true,
    ruleTypeId: 'test_rule_type',
    schedule: { interval: '5d' },
    actions: [{ id: 'test', group: 'rule', params: { message: 'test' } }],
    params: { name: 'test rule type name' },
    scheduledTaskId: null,
    createdBy: null,
    updatedBy: null,
    apiKeyOwner: null,
    throttle: '1m',
    muteAll: false,
    mutedInstanceIds: [],
    executionStatus: {
      status: 'warning',
      lastDuration: 500,
      lastExecutionDate: new Date('2020-08-20T19:23:38Z'),
      warning: {
        reason: RuleExecutionStatusWarningReasons.MAX_EXECUTABLE_ACTIONS,
        message: 'test',
      },
    },
  },
];

const MOCK_RULE_DATA = {
  page: 1,
  perPage: 10000,
  total: 4,
  data: mockedRulesData,
};

describe('useLoadRules', () => {
  beforeEach(() => {
    loadRules.mockResolvedValue(MOCK_RULE_DATA);
    jest.clearAllMocks();
  });

  it('should call loadRules API and handle result', async () => {
    const params = {
      page: {
        index: 0,
        size: 25,
      },
      searchText: '',
      typesFilter: [],
      actionTypesFilter: [],
      ruleExecutionStatusesFilter: [],
      ruleStatusesFilter: [],
      tagsFilter: [],
    };

    const { result, waitForNextUpdate } = renderHook(() =>
      useLoadRules({
        ...params,
        onPage,
        onError,
      })
    );

    expect(result.current.initialLoad).toBeTruthy();
    expect(result.current.noData).toBeTruthy();
    expect(result.current.rulesState.isLoading).toBeFalsy();

    await act(async () => {
      result.current.loadRules();
      await waitForNextUpdate();
    });

    expect(result.current.initialLoad).toBeFalsy();
    expect(result.current.noData).toBeFalsy();
    expect(result.current.rulesState.isLoading).toBeFalsy();

    expect(onPage).toBeCalledTimes(0);
    expect(loadRules).toBeCalledWith(expect.objectContaining(params));
    expect(result.current.rulesState.data).toEqual(expect.arrayContaining(MOCK_RULE_DATA.data));
    expect(result.current.rulesState.totalItemCount).toEqual(MOCK_RULE_DATA.total);
  });

  it('should call loadRules API with params and handle result', async () => {
    const params = {
      page: {
        index: 0,
        size: 25,
      },
      searchText: 'test',
      typesFilter: ['type1', 'type2'],
      actionTypesFilter: ['action1', 'action2'],
      ruleExecutionStatusesFilter: ['status1', 'status2'],
      ruleStatusesFilter: ['enabled', 'snoozed'] as RuleStatus[],
      tagsFilter: ['tag1', 'tag2'],
    };

    const { result, waitForNextUpdate } = renderHook(() =>
      useLoadRules({
        ...params,
        onPage,
        onError,
      })
    );

    await act(async () => {
      result.current.loadRules();
      await waitForNextUpdate();
    });

    expect(loadRules).toBeCalledWith(expect.objectContaining(params));
  });

  it('should reset the page if the data is fetched while paged', async () => {
    loadRules.mockResolvedValue({
      ...MOCK_RULE_DATA,
      data: [],
    });

    const params = {
      page: {
        index: 1,
        size: 25,
      },
      searchText: '',
      typesFilter: [],
      actionTypesFilter: [],
      ruleExecutionStatusesFilter: [],
      ruleStatusesFilter: [],
      tagsFilter: [],
    };

    const { result, waitForNextUpdate } = renderHook(() =>
      useLoadRules({
        ...params,
        onPage,
        onError,
      })
    );

    await act(async () => {
      result.current.loadRules();
      await waitForNextUpdate();
    });

    expect(onPage).toHaveBeenCalledWith({
      index: 0,
      size: 25,
    });
  });

  it('should call onError if API fails', async () => {
    loadRules.mockRejectedValue('');
    const params = {
      page: {
        index: 0,
        size: 25,
      },
      searchText: '',
      typesFilter: [],
      actionTypesFilter: [],
      ruleExecutionStatusesFilter: [],
      ruleStatusesFilter: [],
      tagsFilter: [],
    };

    const { result } = renderHook(() =>
      useLoadRules({
        ...params,
        onPage,
        onError,
      })
    );

    await act(async () => {
      result.current.loadRules();
    });

    expect(onError).toBeCalled();
  });
});
