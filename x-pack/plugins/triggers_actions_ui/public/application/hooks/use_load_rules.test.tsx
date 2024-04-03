/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { renderHook } from '@testing-library/react-hooks/dom';
import { useLoadRulesQuery as useLoadRules } from './use_load_rules_query';
import {
  RuleExecutionStatusErrorReasons,
  RuleExecutionStatusWarningReasons,
} from '@kbn/alerting-plugin/common';
import { RuleStatus } from '../../types';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useKibana } from '../../common/lib/kibana';
import { IToasts } from '@kbn/core-notifications-browser';
import { waitFor } from '@testing-library/react';

jest.mock('../../common/lib/kibana');
jest.mock('../lib/rule_api/rules_kuery_filter', () => ({
  loadRulesWithKueryFilter: jest.fn(),
}));

const useKibanaMock = useKibana as jest.Mocked<typeof useKibana>;

const { loadRulesWithKueryFilter } = jest.requireMock('../lib/rule_api/rules_kuery_filter');

const onPage = jest.fn();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      cacheTime: 0,
    },
  },
});
const wrapper = ({ children }: { children: Node }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
);

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
    useKibanaMock().services.notifications.toasts = {
      addDanger: jest.fn(),
    } as unknown as IToasts;
    loadRulesWithKueryFilter.mockResolvedValue(MOCK_RULE_DATA);
  });
  afterEach(() => {
    queryClient.clear();
    jest.clearAllMocks();
  });

  it('should call loadRules API and handle result', async () => {
    const params = {
      page: {
        index: 0,
        size: 25,
      },
      filters: {
        searchText: '',
        types: [],
        actionTypes: [],
        ruleExecutionStatuses: [],
        ruleParams: {},
        ruleLastRunOutcomes: [],
        ruleStatuses: [],
        tags: [],
      },
      onPage: () => {},
      enabled: true,
      sort: { field: 'name', direction: 'asc' },
    };

    const { result, waitForNextUpdate, rerender } = renderHook(() => useLoadRules(params), {
      wrapper,
    });

    expect(result.current.rulesState.initialLoad).toBeTruthy();
    expect(result.current.hasData).toBeFalsy();
    expect(result.current.rulesState.isLoading).toBeTruthy();

    rerender();
    await waitForNextUpdate();

    expect(result.current.rulesState.initialLoad).toBeFalsy();
    expect(result.current.hasData).toBeTruthy();
    expect(result.current.rulesState.isLoading).toBeFalsy();

    expect(onPage).toBeCalledTimes(0);
    expect(loadRulesWithKueryFilter).toBeCalledWith(
      expect.objectContaining({
        page: {
          index: 0,
          size: 25,
        },
        searchText: '',
        typesFilter: [],
        actionTypesFilter: [],
        ruleExecutionStatusesFilter: [],
        ruleLastRunOutcomesFilter: [],
        ruleStatusesFilter: [],
        tagsFilter: [],
        sort: { field: 'name', direction: 'asc' },
      })
    );
    expect(result.current.rulesState.data).toEqual(expect.arrayContaining(MOCK_RULE_DATA.data));
    expect(result.current.rulesState.totalItemCount).toEqual(MOCK_RULE_DATA.total);
  });

  it('should call loadRules API with params and handle result', async () => {
    const params = {
      page: {
        index: 0,
        size: 25,
      },
      filters: {
        searchText: 'test',
        types: ['type1', 'type2'],
        actionTypes: ['action1', 'action2'],
        ruleExecutionStatuses: ['status1', 'status2'],
        ruleParams: {},
        ruleLastRunOutcomes: ['outcome1', 'outcome2'],
        ruleStatuses: ['enabled', 'snoozed'] as RuleStatus[],
        tags: ['tag1', 'tag2'],
      },
      onPage: () => {},
      enabled: true,
      sort: { field: 'name', direction: 'asc' },
    };

    const { waitForNextUpdate, rerender } = renderHook(() => useLoadRules(params), {
      wrapper,
    });

    rerender();
    await waitForNextUpdate();

    expect(loadRulesWithKueryFilter).toBeCalledWith(
      expect.objectContaining({
        page: {
          index: 0,
          size: 25,
        },
        searchText: 'test',
        typesFilter: ['type1', 'type2'],
        actionTypesFilter: ['action1', 'action2'],
        ruleExecutionStatusesFilter: ['status1', 'status2'],
        ruleLastRunOutcomesFilter: ['outcome1', 'outcome2'],
        ruleParamsFilter: {},
        ruleStatusesFilter: ['enabled', 'snoozed'],
        tagsFilter: ['tag1', 'tag2'],
        sort: { field: 'name', direction: 'asc' },
      })
    );
  });

  it('should reset the page if the data is fetched while paged', async () => {
    loadRulesWithKueryFilter.mockResolvedValue({
      ...MOCK_RULE_DATA,
      data: [],
    });

    const params = {
      page: {
        index: 1,
        size: 25,
      },
      filters: {
        searchText: '',
        types: [],
        actionTypes: [],
        ruleExecutionStatuses: [],
        ruleParams: {},
        ruleLastRunOutcomes: [],
        ruleStatuses: [],
        tags: [],
      },
      onPage,
      enabled: true,
      sort: { field: 'name', direction: 'asc' },
    };

    const { rerender, waitForNextUpdate } = renderHook(
      () => {
        return useLoadRules(params);
      },
      { wrapper }
    );

    rerender();
    await waitForNextUpdate();

    expect(onPage).toHaveBeenCalledWith({
      index: 0,
      size: 25,
    });
  });

  it('should call onError if API fails', async () => {
    loadRulesWithKueryFilter.mockRejectedValue('');
    const params = {
      page: {
        index: 0,
        size: 25,
      },
      filters: {
        searchText: '',
        types: [],
        actionTypes: [],
        ruleExecutionStatuses: [],
        ruleParams: {},
        ruleLastRunOutcomes: [],
        ruleStatuses: [],
        tags: [],
      },
      onPage: () => {},
      enabled: true,
      sort: { field: 'name', direction: 'asc' },
    };

    renderHook(() => useLoadRules(params), { wrapper });

    await waitFor(() =>
      expect(useKibanaMock().services.notifications.toasts.addDanger).toBeCalled()
    );
  });

  describe('No data', () => {
    it('hasData should be false, if there is no Filter and no rules', async () => {
      loadRulesWithKueryFilter.mockResolvedValue({ ...MOCK_RULE_DATA, data: [] });
      const params = {
        page: {
          index: 0,
          size: 25,
        },
        filters: {
          searchText: '',
          types: [],
          actionTypes: [],
          ruleExecutionStatuses: [],
          ruleParams: {},
          ruleLastRunOutcomes: [],
          ruleStatuses: [],
          tags: [],
        },
        onPage: () => {},
        enabled: true,
        sort: { field: 'name', direction: 'asc' },
      };

      const { rerender, result, waitForNextUpdate } = renderHook(() => useLoadRules(params), {
        wrapper,
      });

      expect(result.current.hasData).toBeFalsy();

      rerender();
      await waitForNextUpdate();

      expect(result.current.hasData).toBeFalsy();
    });

    it('hasData should be false, if there is rule types filter and no rules with hasDefaultRuleTypesFiltersOn = true', async () => {
      loadRulesWithKueryFilter.mockResolvedValue({ ...MOCK_RULE_DATA, data: [] });
      const params = {
        page: {
          index: 0,
          size: 25,
        },
        filters: {
          searchText: '',
          types: ['some-kind-of-filter'],
          actionTypes: [],
          ruleExecutionStatuses: [],
          ruleParams: {},
          ruleLastRunOutcomes: [],
          ruleStatuses: [],
          tags: [],
        },
        onPage: () => {},
        enabled: true,
        sort: { field: 'name', direction: 'asc' },
        hasDefaultRuleTypesFiltersOn: true,
      };

      const { rerender, result, waitForNextUpdate } = renderHook(() => useLoadRules(params), {
        wrapper,
      });

      expect(result.current.hasData).toBeFalsy();

      rerender();
      await waitForNextUpdate();

      expect(result.current.hasData).toBeFalsy();
    });
  });
});
