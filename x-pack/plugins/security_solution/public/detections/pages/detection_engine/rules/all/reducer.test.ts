/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { FilterOptions, PaginationOptions } from '../../../../containers/detection_engine/rules';

import { Action, State, allRulesReducer } from './reducer';
import { mockRule } from './__mocks__/mock';

const initialState: State = {
  exportRuleIds: [],
  filterOptions: {
    filter: '',
    sortField: 'enabled',
    sortOrder: 'desc',
  },
  loadingRuleIds: [],
  loadingRulesAction: null,
  pagination: {
    page: 1,
    perPage: 20,
    total: 0,
  },
  rules: [],
  selectedRuleIds: [],
  lastUpdated: 0,
  showIdleModal: false,
  isRefreshOn: false,
};

describe('allRulesReducer', () => {
  let reducer: (state: State, action: Action) => State;

  beforeEach(() => {
    jest.useFakeTimers();
    jest
      .spyOn(global.Date, 'now')
      .mockImplementationOnce(() => new Date('2020-10-31T11:01:58.135Z').valueOf());
    reducer = allRulesReducer({ current: undefined });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('#exportRuleIds', () => {
    test('should update state with rules to be exported', () => {
      const { loadingRuleIds, loadingRulesAction, exportRuleIds } = reducer(initialState, {
        type: 'exportRuleIds',
        ids: ['123', '456'],
      });

      expect(loadingRuleIds).toEqual(['123', '456']);
      expect(exportRuleIds).toEqual(['123', '456']);
      expect(loadingRulesAction).toEqual('export');
    });
  });

  describe('#loadingRuleIds', () => {
    test('should update state with rule ids with a pending action', () => {
      const { loadingRuleIds, loadingRulesAction } = reducer(initialState, {
        type: 'loadingRuleIds',
        ids: ['123', '456'],
        actionType: 'enable',
      });

      expect(loadingRuleIds).toEqual(['123', '456']);
      expect(loadingRulesAction).toEqual('enable');
    });

    test('should update loadingIds to empty array if action is null', () => {
      const { loadingRuleIds, loadingRulesAction } = reducer(initialState, {
        type: 'loadingRuleIds',
        ids: ['123', '456'],
        actionType: null,
      });

      expect(loadingRuleIds).toEqual([]);
      expect(loadingRulesAction).toBeNull();
    });

    test('should append rule ids to any existing loading ids', () => {
      const { loadingRuleIds, loadingRulesAction } = reducer(
        { ...initialState, loadingRuleIds: ['abc'] },
        {
          type: 'loadingRuleIds',
          ids: ['123', '456'],
          actionType: 'duplicate',
        }
      );

      expect(loadingRuleIds).toEqual(['abc', '123', '456']);
      expect(loadingRulesAction).toEqual('duplicate');
    });
  });

  describe('#selectedRuleIds', () => {
    test('should update state with selected rule ids', () => {
      const { selectedRuleIds } = reducer(initialState, {
        type: 'selectedRuleIds',
        ids: ['123', '456'],
      });

      expect(selectedRuleIds).toEqual(['123', '456']);
    });
  });

  describe('#setRules', () => {
    test('should update rules and reset loading/selected rule ids', () => {
      const { selectedRuleIds, loadingRuleIds, loadingRulesAction, pagination, rules } = reducer(
        initialState,
        {
          type: 'setRules',
          rules: [mockRule('someRuleId')],
          pagination: {
            page: 1,
            perPage: 20,
            total: 0,
          },
        }
      );

      expect(rules).toEqual([mockRule('someRuleId')]);
      expect(selectedRuleIds).toEqual([]);
      expect(loadingRuleIds).toEqual([]);
      expect(loadingRulesAction).toBeNull();
      expect(pagination).toEqual({
        page: 1,
        perPage: 20,
        total: 0,
      });
    });
  });

  describe('#updateRules', () => {
    test('should return existing and new rules', () => {
      const existingRule = { ...mockRule('123'), rule_id: 'rule-123' };
      const { rules, loadingRulesAction } = reducer(
        { ...initialState, rules: [existingRule] },
        {
          type: 'updateRules',
          rules: [mockRule('someRuleId')],
        }
      );

      expect(rules).toEqual([existingRule, mockRule('someRuleId')]);
      expect(loadingRulesAction).toBeNull();
    });

    test('should return updated rule', () => {
      const updatedRule = { ...mockRule('someRuleId'), description: 'updated rule' };
      const { rules, loadingRulesAction } = reducer(
        { ...initialState, rules: [mockRule('someRuleId')] },
        {
          type: 'updateRules',
          rules: [updatedRule],
        }
      );

      expect(rules).toEqual([updatedRule]);
      expect(loadingRulesAction).toBeNull();
    });

    test('should return updated existing loading rule ids', () => {
      const existingRule = { ...mockRule('someRuleId'), id: '123', rule_id: 'rule-123' };
      const { loadingRuleIds, loadingRulesAction } = reducer(
        {
          ...initialState,
          rules: [existingRule],
          loadingRuleIds: ['123'],
          loadingRulesAction: 'enable',
        },
        {
          type: 'updateRules',
          rules: [mockRule('someRuleId')],
        }
      );

      expect(loadingRuleIds).toEqual(['123']);
      expect(loadingRulesAction).toEqual('enable');
    });
  });

  describe('#updateFilterOptions', () => {
    test('should return existing and new rules', () => {
      const paginationMock: PaginationOptions = {
        page: 1,
        perPage: 20,
        total: 0,
      };
      const filterMock: FilterOptions = {
        filter: 'host.name:*',
        sortField: 'enabled',
        sortOrder: 'desc',
      };
      const { filterOptions, pagination } = reducer(initialState, {
        type: 'updateFilterOptions',
        filterOptions: filterMock,
        pagination: paginationMock,
      });

      expect(filterOptions).toEqual(filterMock);
      expect(pagination).toEqual(paginationMock);
    });
  });

  describe('#failure', () => {
    test('should reset rules value to empty array', () => {
      const { rules } = reducer(initialState, {
        type: 'failure',
      });

      expect(rules).toEqual([]);
    });
  });

  describe('#setLastRefreshDate', () => {
    test('should update last refresh date with current date', () => {
      const { lastUpdated } = reducer(initialState, {
        type: 'setLastRefreshDate',
      });

      expect(lastUpdated).toEqual(1604142118135);
    });
  });

  describe('#setShowIdleModal', () => {
    test('should hide idle modal and restart refresh if "show" is false', () => {
      const { showIdleModal, isRefreshOn } = reducer(initialState, {
        type: 'setShowIdleModal',
        show: false,
      });

      expect(showIdleModal).toBeFalsy();
      expect(isRefreshOn).toBeTruthy();
    });

    test('should show idle modal and pause refresh if "show" is true', () => {
      const { showIdleModal, isRefreshOn } = reducer(initialState, {
        type: 'setShowIdleModal',
        show: true,
      });

      expect(showIdleModal).toBeTruthy();
      expect(isRefreshOn).toBeFalsy();
    });
  });

  describe('#setAutoRefreshOn', () => {
    test('should pause auto refresh if "paused" is true', () => {
      const { isRefreshOn } = reducer(initialState, {
        type: 'setAutoRefreshOn',
        on: true,
      });

      expect(isRefreshOn).toBeTruthy();
    });

    test('should resume auto refresh if "paused" is false', () => {
      const { isRefreshOn } = reducer(initialState, {
        type: 'setAutoRefreshOn',
        on: false,
      });

      expect(isRefreshOn).toBeFalsy();
    });
  });
});
