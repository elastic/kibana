/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mockRule } from '../../../../pages/detection_engine/rules/all/__mocks__/mock';
import { FilterOptions, PaginationOptions } from '../types';
import { RulesTableState, rulesTableReducer } from './rules_table_reducer';

const initialState: RulesTableState = {
  rules: [],
  pagination: {
    page: 1,
    perPage: 20,
    total: 0,
  },
  filterOptions: {
    filter: '',
    sortField: 'enabled',
    sortOrder: 'desc',
    tags: [],
    showCustomRules: false,
    showElasticRules: false,
  },
  isAllSelected: false,
  loadingRulesAction: null,
  loadingRuleIds: [],
  selectedRuleIds: [],
  lastUpdated: 0,
  isRefreshOn: false,
  isRefreshing: false,
  showIdleModal: false,
};

describe('allRulesReducer', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest
      .spyOn(global.Date, 'now')
      .mockImplementationOnce(() => new Date('2020-10-31T11:01:58.135Z').valueOf());
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('#loadingRuleIds', () => {
    it('should update state with rule ids with a pending action', () => {
      const { loadingRuleIds, loadingRulesAction } = rulesTableReducer(initialState, {
        type: 'loadingRuleIds',
        ids: ['123', '456'],
        actionType: 'enable',
      });

      expect(loadingRuleIds).toEqual(['123', '456']);
      expect(loadingRulesAction).toEqual('enable');
    });

    it('should update loadingIds to empty array if action is null', () => {
      const { loadingRuleIds, loadingRulesAction } = rulesTableReducer(initialState, {
        type: 'loadingRuleIds',
        ids: ['123', '456'],
        actionType: null,
      });

      expect(loadingRuleIds).toEqual([]);
      expect(loadingRulesAction).toBeNull();
    });

    it('should append rule ids to any existing loading ids', () => {
      const { loadingRuleIds, loadingRulesAction } = rulesTableReducer(
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
    it('should update state with selected rule ids', () => {
      const { selectedRuleIds } = rulesTableReducer(initialState, {
        type: 'selectedRuleIds',
        ids: ['123', '456'],
      });

      expect(selectedRuleIds).toEqual(['123', '456']);
    });
  });

  describe('#setRules', () => {
    it('should update rules and reset loading/selected rule ids', () => {
      const { selectedRuleIds, loadingRuleIds, loadingRulesAction, pagination, rules } =
        rulesTableReducer(initialState, {
          type: 'setRules',
          rules: [mockRule('someRuleId')],
          pagination: {
            page: 1,
            perPage: 20,
            total: 0,
          },
        });

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
    it('should return existing and new rules', () => {
      const existingRule = { ...mockRule('123'), rule_id: 'rule-123' };
      const { rules, loadingRulesAction } = rulesTableReducer(
        { ...initialState, rules: [existingRule] },
        {
          type: 'updateRules',
          rules: [mockRule('someRuleId')],
        }
      );

      expect(rules).toEqual([existingRule, mockRule('someRuleId')]);
      expect(loadingRulesAction).toBeNull();
    });

    it('should return updated rule', () => {
      const updatedRule = { ...mockRule('someRuleId'), description: 'updated rule' };
      const { rules, loadingRulesAction } = rulesTableReducer(
        { ...initialState, rules: [mockRule('someRuleId')] },
        {
          type: 'updateRules',
          rules: [updatedRule],
        }
      );

      expect(rules).toEqual([updatedRule]);
      expect(loadingRulesAction).toBeNull();
    });

    it('should return updated existing loading rule ids', () => {
      const existingRule = { ...mockRule('someRuleId'), id: '123', rule_id: 'rule-123' };
      const { loadingRuleIds, loadingRulesAction } = rulesTableReducer(
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
    it('should return existing and new rules', () => {
      const paginationMock: PaginationOptions = {
        page: 1,
        perPage: 20,
        total: 0,
      };
      const filterMock: FilterOptions = {
        filter: 'host.name:*',
        sortField: 'enabled',
        sortOrder: 'desc',
        tags: [],
        showCustomRules: false,
        showElasticRules: false,
      };
      const { filterOptions, pagination } = rulesTableReducer(initialState, {
        type: 'updateFilterOptions',
        filterOptions: filterMock,
        pagination: paginationMock,
      });

      expect(filterOptions).toEqual(filterMock);
      expect(pagination).toEqual(paginationMock);
    });
  });

  describe('#failure', () => {
    it('should reset rules value to empty array', () => {
      const { rules } = rulesTableReducer(initialState, {
        type: 'failure',
      });

      expect(rules).toEqual([]);
    });
  });

  describe('#setLastRefreshDate', () => {
    it('should update last refresh date with current date', () => {
      const { lastUpdated } = rulesTableReducer(initialState, {
        type: 'setLastRefreshDate',
      });

      expect(lastUpdated).toEqual(1604142118135);
    });
  });

  describe('#setShowIdleModal', () => {
    it('should hide idle modal and restart refresh if "show" is false', () => {
      const { showIdleModal, isRefreshOn } = rulesTableReducer(initialState, {
        type: 'setShowIdleModal',
        show: false,
      });

      expect(showIdleModal).toBeFalsy();
      expect(isRefreshOn).toBeTruthy();
    });

    it('should show idle modal and pause refresh if "show" is true', () => {
      const { showIdleModal, isRefreshOn } = rulesTableReducer(initialState, {
        type: 'setShowIdleModal',
        show: true,
      });

      expect(showIdleModal).toBeTruthy();
      expect(isRefreshOn).toBeFalsy();
    });
  });

  describe('#setAutoRefreshOn', () => {
    it('should pause auto refresh if "paused" is true', () => {
      const { isRefreshOn } = rulesTableReducer(initialState, {
        type: 'setAutoRefreshOn',
        on: true,
      });

      expect(isRefreshOn).toBeTruthy();
    });

    it('should resume auto refresh if "paused" is false', () => {
      const { isRefreshOn } = rulesTableReducer(initialState, {
        type: 'setAutoRefreshOn',
        on: false,
      });

      expect(isRefreshOn).toBeFalsy();
    });
  });

  describe('#selectAllRules', () => {
    it('should select all rules', () => {
      const state = rulesTableReducer(
        {
          ...initialState,
          rules: [mockRule('1'), mockRule('2'), mockRule('3')],
        },
        {
          type: 'setIsAllSelected',
          isAllSelected: true,
        }
      );

      expect(state.isAllSelected).toBe(true);
      expect(state.selectedRuleIds).toEqual(['1', '2', '3']);
    });

    it('should deselect all rules', () => {
      const state = rulesTableReducer(
        {
          ...initialState,
          rules: [mockRule('1'), mockRule('2'), mockRule('3')],
          isAllSelected: true,
          selectedRuleIds: ['1', '2', '3'],
        },
        {
          type: 'setIsAllSelected',
          isAllSelected: false,
        }
      );

      expect(state.isAllSelected).toBe(false);
      expect(state.selectedRuleIds).toEqual([]);
    });

    it('should unset "isAllSelected" on selected rules modification', () => {
      const state = rulesTableReducer(
        {
          ...initialState,
          rules: [mockRule('1'), mockRule('2'), mockRule('3')],
          isAllSelected: true,
          selectedRuleIds: ['1', '2', '3'],
        },
        {
          type: 'selectedRuleIds',
          ids: ['1', '2'],
        }
      );

      expect(state.isAllSelected).toBe(false);
      expect(state.selectedRuleIds).toEqual(['1', '2']);
    });
  });
});
