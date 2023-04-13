/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react-hooks';
import type { PropsWithChildren } from 'react';
import React from 'react';
import { useUiSetting$ } from '../../../../../common/lib/kibana';
import { useFindRules } from '../../../../rule_management/logic/use_find_rules';
import type { RulesTableState } from './rules_table_context';
import { RulesTableContextProvider, useRulesTableContext } from './rules_table_context';
import {
  DEFAULT_FILTER_OPTIONS,
  DEFAULT_PAGE,
  DEFAULT_RULES_PER_PAGE,
  DEFAULT_SORTING_OPTIONS,
} from './rules_table_defaults';
import { RuleSource } from './rules_table_saved_state';
import { useRulesTableSavedState } from './use_rules_table_saved_state';

jest.mock('../../../../../common/lib/kibana');
jest.mock('../../../../rule_management/logic/use_find_rules');
jest.mock('./use_rules_table_saved_state');

function renderUseRulesTableContext(
  savedState: ReturnType<typeof useRulesTableSavedState>
): RulesTableState {
  (useFindRules as jest.Mock).mockReturnValue({
    data: { rules: [], total: 0 },
    refetch: jest.fn(),
    dataUpdatedAt: 0,
    isFetched: false,
    isFetching: false,
    isLoading: false,
    isRefetching: false,
  });
  (useUiSetting$ as jest.Mock).mockReturnValue([{ on: false, value: 0, idleTimeout: 0 }]);
  (useRulesTableSavedState as jest.Mock).mockReturnValue(savedState);

  const wrapper = ({ children }: PropsWithChildren<{}>) => (
    <RulesTableContextProvider>{children}</RulesTableContextProvider>
  );
  const {
    result: {
      current: { state },
    },
  } = renderHook(() => useRulesTableContext(), { wrapper });

  return state;
}

describe('RulesTableContextProvider', () => {
  describe('persisted state', () => {
    it('restores persisted rules table state', () => {
      const state = renderUseRulesTableContext({
        filter: {
          searchTerm: 'test',
          source: RuleSource.Custom,
          tags: ['test'],
          enabled: true,
        },
        sorting: {
          field: 'name',
          order: 'asc',
        },
        pagination: {
          page: 2,
          perPage: 10,
        },
      });

      expect(state.filterOptions).toEqual({
        filter: 'test',
        tags: ['test'],
        showCustomRules: true,
        showElasticRules: false,
        enabled: true,
      });
      expect(state.sortingOptions).toEqual({
        field: 'name',
        order: 'asc',
      });
      expect(state.pagination).toEqual({
        page: 2,
        perPage: 10,
        total: 0,
      });
      expect(state.isDefault).toBeFalsy();
    });

    it('restores default rules table state', () => {
      const state = renderUseRulesTableContext({});

      expect(state.filterOptions).toEqual({
        filter: DEFAULT_FILTER_OPTIONS.filter,
        tags: DEFAULT_FILTER_OPTIONS.tags,
        showCustomRules: DEFAULT_FILTER_OPTIONS.showCustomRules,
        showElasticRules: DEFAULT_FILTER_OPTIONS.showElasticRules,
      });
      expect(state.sortingOptions).toEqual({
        field: DEFAULT_SORTING_OPTIONS.field,
        order: DEFAULT_SORTING_OPTIONS.order,
      });
      expect(state.pagination).toEqual({
        page: DEFAULT_PAGE,
        perPage: DEFAULT_RULES_PER_PAGE,
        total: 0,
      });
      expect(state.isDefault).toBeTruthy();
    });
  });
});
