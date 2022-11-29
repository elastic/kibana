/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react-hooks';
import { useReplaceUrlParams } from '../../../../../common/utils/global_query_string/helpers';
import { useKibana } from '../../../../../common/lib/kibana';
import { URL_PARAM_KEY } from '../../../../../common/hooks/use_url_state';
import { RULES_TABLE_STATE_STORAGE_KEY } from '../constants';
import {
  DEFAULT_PAGE,
  DEFAULT_RULES_PER_PAGE,
  DEFAULT_FILTER_OPTIONS,
  DEFAULT_SORTING_OPTIONS,
} from './rules_table_defaults';
import type { RulesTableState } from './rules_table_context';
import { useRulesTableContext } from './rules_table_context';
import type { RulesTableSavedState } from './rules_table_saved_state';
import { useSyncRulesTableSavedState } from './use_sync_rules_table_saved_state';

jest.mock('../../../../../common/lib/kibana');
jest.mock('../../../../../common/utils/global_query_string/helpers', () => ({
  useReplaceUrlParams: jest.fn(),
  encodeRisonUrlState: jest.fn().mockImplementation((value) => value),
}));
jest.mock('./rules_table_context');

describe('useSyncRulesTableSavedState', () => {
  const defaultState = {
    filterOptions: DEFAULT_FILTER_OPTIONS,
    sortingOptions: DEFAULT_SORTING_OPTIONS,
    pagination: {
      page: DEFAULT_PAGE,
      perPage: DEFAULT_RULES_PER_PAGE,
      total: 100,
    },
  };
  const expectStateToSyncWithUrl = (
    rulesTableState: Partial<RulesTableState>,
    expectedUrlState: RulesTableSavedState
  ) => {
    (useRulesTableContext as jest.Mock).mockReturnValue({
      state: rulesTableState,
    });

    renderHook(() => useSyncRulesTableSavedState());

    expect(replaceUrlParams).toHaveBeenCalledWith([
      {
        key: URL_PARAM_KEY.rulesTable,
        value: expectedUrlState,
      },
    ]);
  };
  const expectStateToSyncWithStorage = (
    rulesTableState: Partial<RulesTableState>,
    expectedStorageState: RulesTableSavedState
  ) => {
    (useRulesTableContext as jest.Mock).mockReturnValue({
      state: rulesTableState,
    });

    renderHook(() => useSyncRulesTableSavedState());

    expect(setStorage).toHaveBeenCalledWith(RULES_TABLE_STATE_STORAGE_KEY, expectedStorageState);
  };

  let replaceUrlParams: jest.Mock;
  let setStorage: jest.Mock;
  let removeStorage: jest.Mock;

  beforeEach(() => {
    replaceUrlParams = jest.fn();
    setStorage = jest.fn();
    removeStorage = jest.fn();

    (useReplaceUrlParams as jest.Mock).mockReturnValue(replaceUrlParams);
    (useKibana as jest.Mock).mockReturnValue({
      services: { sessionStorage: { set: setStorage, remove: removeStorage } },
    });
  });

  it('clears the default state when there is nothing to sync', () => {
    (useRulesTableContext as jest.Mock).mockReturnValue({ state: defaultState });

    renderHook(() => useSyncRulesTableSavedState());

    expect(replaceUrlParams).toHaveBeenCalledWith([{ key: URL_PARAM_KEY.rulesTable, value: null }]);
    expect(setStorage).not.toHaveBeenCalled();
    expect(removeStorage).toHaveBeenCalledWith(RULES_TABLE_STATE_STORAGE_KEY);
  });

  it('syncs both the url and the storage', () => {
    const state = {
      filterOptions: {
        filter: 'test',
        tags: ['test'],
        showCustomRules: true,
        showElasticRules: false,
      },
      sortingOptions: {
        field: 'name',
        order: 'asc',
      },
      pagination: {
        page: 3,
        perPage: 10,
        total: 100,
      },
    };
    const expectedUrlState = {
      searchTerm: 'test',
      showCustomRules: true,
      tags: ['test'],
      sort: {
        field: 'name',
        order: 'asc',
      },
      page: 3,
      perPage: 10,
    };
    const expectedStorageState = { ...expectedUrlState };
    delete expectedStorageState.page;

    (useRulesTableContext as jest.Mock).mockReturnValue({
      state,
    });

    renderHook(() => useSyncRulesTableSavedState());

    expect(replaceUrlParams).toHaveBeenCalledWith([
      { key: URL_PARAM_KEY.rulesTable, value: expectedUrlState },
    ]);
    expect(setStorage).toHaveBeenCalledWith(RULES_TABLE_STATE_STORAGE_KEY, expectedStorageState);
  });

  describe('with the url', () => {
    it('syncs only the search term', () => {
      expectStateToSyncWithUrl(
        { ...defaultState, filterOptions: { ...DEFAULT_FILTER_OPTIONS, filter: 'test' } },
        { searchTerm: 'test' }
      );
    });

    it('syncs only the show elastic rules filter', () => {
      expectStateToSyncWithUrl(
        {
          ...defaultState,
          filterOptions: { ...defaultState.filterOptions, showElasticRules: true },
        },
        { showCustomRules: false }
      );
    });

    it('syncs only the show custom rules filter', () => {
      expectStateToSyncWithUrl(
        {
          ...defaultState,
          filterOptions: { ...defaultState.filterOptions, showCustomRules: true },
        },
        { showCustomRules: true }
      );
    });

    it('syncs only the tags', () => {
      expectStateToSyncWithUrl(
        {
          ...defaultState,
          filterOptions: { ...defaultState.filterOptions, tags: ['test'] },
        },
        { tags: ['test'] }
      );
    });

    it('syncs only the sorting field', () => {
      expectStateToSyncWithUrl(
        {
          ...defaultState,
          sortingOptions: { ...defaultState.sortingOptions, field: 'name' },
        },
        { sort: { field: 'name' } }
      );
    });

    it('syncs only the sorting order', () => {
      expectStateToSyncWithUrl(
        {
          ...defaultState,
          sortingOptions: { ...defaultState.sortingOptions, order: 'asc' },
        },
        { sort: { order: 'asc' } }
      );
    });

    it('syncs only the page number', () => {
      expectStateToSyncWithUrl(
        {
          ...defaultState,
          pagination: {
            ...defaultState.pagination,
            page: 10,
          },
        },
        { page: 10 }
      );
    });

    it('syncs only the page size', () => {
      expectStateToSyncWithUrl(
        {
          ...defaultState,
          pagination: {
            ...defaultState.pagination,
            perPage: 10,
          },
        },
        { perPage: 10 }
      );
    });
  });

  describe('with the storage', () => {
    it('syncs only the search term', () => {
      expectStateToSyncWithStorage(
        { ...defaultState, filterOptions: { ...defaultState.filterOptions, filter: 'test' } },
        { searchTerm: 'test' }
      );
    });

    it('syncs only the show elastic rules filter', () => {
      expectStateToSyncWithStorage(
        {
          ...defaultState,
          filterOptions: { ...defaultState.filterOptions, showElasticRules: true },
        },
        { showCustomRules: false }
      );
    });

    it('syncs only the show custom rules filter', () => {
      expectStateToSyncWithStorage(
        {
          ...defaultState,
          filterOptions: { ...defaultState.filterOptions, showCustomRules: true },
        },
        { showCustomRules: true }
      );
    });

    it('syncs only the tags', () => {
      expectStateToSyncWithStorage(
        {
          ...defaultState,
          filterOptions: { ...defaultState.filterOptions, tags: ['test'] },
        },
        { tags: ['test'] }
      );
    });

    it('syncs only the sorting field', () => {
      expectStateToSyncWithStorage(
        {
          ...defaultState,
          sortingOptions: { ...defaultState.sortingOptions, field: 'name' },
        },
        { sort: { field: 'name' } }
      );
    });

    it('syncs only the sorting order', () => {
      expectStateToSyncWithStorage(
        {
          ...defaultState,
          sortingOptions: { ...defaultState.sortingOptions, order: 'asc' },
        },
        { sort: { order: 'asc' } }
      );
    });

    it('does not sync the page number', () => {
      expectStateToSyncWithStorage(
        {
          ...defaultState,
          pagination: {
            ...defaultState.pagination,
            page: 10,
          },
        },
        {}
      );
    });

    it('syncs only the page size', () => {
      expectStateToSyncWithStorage(
        {
          ...defaultState,
          pagination: {
            ...defaultState.pagination,
            perPage: 10,
          },
        },
        { perPage: 10 }
      );
    });
  });
});
