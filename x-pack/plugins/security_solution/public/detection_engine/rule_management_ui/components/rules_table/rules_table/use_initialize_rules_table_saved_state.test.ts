/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react-hooks';
import { RULES_TABLE_MAX_PAGE_SIZE } from '../../../../../../common/constants';

import { useInitializeRulesTableSavedState } from './use_initialize_rules_table_saved_state';
import type { RulesTableSavedState } from './rules_table_saved_state';
import { DEFAULT_FILTER_OPTIONS, DEFAULT_SORTING_OPTIONS } from './rules_table_defaults';
import type { RulesTableActions } from './rules_table_context';
import { useRulesTableContext } from './rules_table_context';
import { mockRulesTablePersistedState } from './__mocks__/mock_rules_table_persistent_state';

jest.mock('../../../../../common/lib/kibana');
jest.mock('../../../../../common/utils/global_query_string/helpers');
jest.mock('./rules_table_context');

describe('useInitializeRulesTableSavedState', () => {
  const urlSavedState: RulesTableSavedState = {
    searchTerm: 'test',
    showCustomRules: true,
    tags: ['test'],
    sort: {
      field: 'name',
      order: 'asc',
    },
    page: 2,
    perPage: 10,
  };
  const storageSavedState: RulesTableSavedState = {
    searchTerm: 'test',
    showCustomRules: true,
    tags: ['test'],
    sort: {
      field: 'name',
      order: 'asc',
    },
    page: 1,
    perPage: 20,
  };
  let actions: Partial<RulesTableActions>;

  beforeEach(() => {
    actions = {
      setFilterOptions: jest.fn(),
      setSortingOptions: jest.fn(),
      setPage: jest.fn(),
      setPerPage: jest.fn(),
    };

    (useRulesTableContext as jest.Mock).mockReturnValue({ actions });
  });

  describe('when state is not saved', () => {
    beforeEach(() => {
      mockRulesTablePersistedState({ urlState: null, storageState: null });
    });

    it('does not restore the state', () => {
      renderHook(() => useInitializeRulesTableSavedState());

      expect(actions.setFilterOptions).not.toHaveBeenCalled();
      expect(actions.setSortingOptions).not.toHaveBeenCalled();
      expect(actions.setPage).not.toHaveBeenCalled();
      expect(actions.setPerPage).not.toHaveBeenCalled();
    });
  });

  describe('when state is saved in the url', () => {
    beforeEach(() => {
      mockRulesTablePersistedState({ urlState: urlSavedState, storageState: null });
    });

    it('restores the state', () => {
      renderHook(() => useInitializeRulesTableSavedState());

      expect(actions.setFilterOptions).toHaveBeenCalledWith({
        filter: urlSavedState.searchTerm,
        showCustomRules: urlSavedState.showCustomRules,
        showElasticRules: !urlSavedState.showCustomRules,
        tags: urlSavedState.tags,
      });
      expect(actions.setSortingOptions).toHaveBeenCalledWith(urlSavedState.sort);
      expect(actions.setPage).toHaveBeenCalledWith(urlSavedState.page);
      expect(actions.setPerPage).toHaveBeenCalledWith(urlSavedState.perPage);
    });

    it('restores the state ignoring negative page size', () => {
      mockRulesTablePersistedState({
        urlState: { ...urlSavedState, perPage: -1 },
        storageState: null,
      });

      renderHook(() => useInitializeRulesTableSavedState());

      expect(actions.setPerPage).not.toHaveBeenCalled();
    });

    it('restores the state ignoring the page size larger than max allowed', () => {
      mockRulesTablePersistedState({
        urlState: { ...urlSavedState, perPage: RULES_TABLE_MAX_PAGE_SIZE + 1 },
        storageState: null,
      });

      renderHook(() => useInitializeRulesTableSavedState());

      expect(actions.setPerPage).not.toHaveBeenCalled();
    });
  });

  describe('when partial state is saved in the url', () => {
    it('restores only the search term', () => {
      mockRulesTablePersistedState({ urlState: { searchTerm: 'test' }, storageState: null });

      renderHook(() => useInitializeRulesTableSavedState());

      expect(actions.setFilterOptions).toHaveBeenCalledWith({
        ...DEFAULT_FILTER_OPTIONS,
        filter: 'test',
      });
      expect(actions.setSortingOptions).not.toHaveBeenCalled();
      expect(actions.setPage).not.toHaveBeenCalled();
      expect(actions.setPerPage).not.toHaveBeenCalled();
    });

    it('restores only show elastic rules filter', () => {
      mockRulesTablePersistedState({ urlState: { showCustomRules: false }, storageState: null });

      renderHook(() => useInitializeRulesTableSavedState());

      expect(actions.setFilterOptions).toHaveBeenCalledWith({
        ...DEFAULT_FILTER_OPTIONS,
        showElasticRules: true,
      });
      expect(actions.setSortingOptions).not.toHaveBeenCalled();
      expect(actions.setPage).not.toHaveBeenCalled();
      expect(actions.setPerPage).not.toHaveBeenCalled();
    });

    it('restores only show custom rules filter', () => {
      mockRulesTablePersistedState({ urlState: { showCustomRules: true }, storageState: null });

      renderHook(() => useInitializeRulesTableSavedState());

      expect(actions.setFilterOptions).toHaveBeenCalledWith({
        ...DEFAULT_FILTER_OPTIONS,
        showCustomRules: true,
      });
      expect(actions.setSortingOptions).not.toHaveBeenCalled();
      expect(actions.setPage).not.toHaveBeenCalled();
      expect(actions.setPerPage).not.toHaveBeenCalled();
    });

    it('restores only tags', () => {
      mockRulesTablePersistedState({ urlState: { tags: ['test'] }, storageState: null });

      renderHook(() => useInitializeRulesTableSavedState());

      expect(actions.setFilterOptions).toHaveBeenCalledWith({
        ...DEFAULT_FILTER_OPTIONS,
        tags: ['test'],
      });
      expect(actions.setSortingOptions).not.toHaveBeenCalled();
      expect(actions.setPage).not.toHaveBeenCalled();
      expect(actions.setPerPage).not.toHaveBeenCalled();
    });

    it('restores only sorting field', () => {
      mockRulesTablePersistedState({ urlState: { sort: { field: 'name' } }, storageState: null });

      renderHook(() => useInitializeRulesTableSavedState());

      expect(actions.setFilterOptions).toHaveBeenCalledWith(DEFAULT_FILTER_OPTIONS);
      expect(actions.setSortingOptions).toHaveBeenCalledWith({
        field: 'name',
        order: DEFAULT_SORTING_OPTIONS.order,
      });
      expect(actions.setPage).not.toHaveBeenCalled();
      expect(actions.setPerPage).not.toHaveBeenCalled();
    });

    it('restores only sorting order', () => {
      mockRulesTablePersistedState({ urlState: { sort: { order: 'asc' } }, storageState: null });

      renderHook(() => useInitializeRulesTableSavedState());

      expect(actions.setFilterOptions).toHaveBeenCalledWith(DEFAULT_FILTER_OPTIONS);
      expect(actions.setSortingOptions).toHaveBeenCalledWith({
        field: DEFAULT_SORTING_OPTIONS.field,
        order: 'asc',
      });
      expect(actions.setPage).not.toHaveBeenCalled();
      expect(actions.setPerPage).not.toHaveBeenCalled();
    });

    it('restores only page number', () => {
      mockRulesTablePersistedState({ urlState: { page: 10 }, storageState: null });

      renderHook(() => useInitializeRulesTableSavedState());

      expect(actions.setFilterOptions).toHaveBeenCalledWith(DEFAULT_FILTER_OPTIONS);
      expect(actions.setSortingOptions).not.toHaveBeenCalled();
      expect(actions.setPage).toHaveBeenCalledWith(10);
      expect(actions.setPerPage).not.toHaveBeenCalled();
    });

    it('restores only page size', () => {
      mockRulesTablePersistedState({ urlState: { perPage: 10 }, storageState: null });

      renderHook(() => useInitializeRulesTableSavedState());

      expect(actions.setFilterOptions).toHaveBeenCalledWith(DEFAULT_FILTER_OPTIONS);
      expect(actions.setSortingOptions).not.toHaveBeenCalled();
      expect(actions.setPage).not.toHaveBeenCalled();
      expect(actions.setPerPage).toHaveBeenCalledWith(10);
    });
  });

  describe('when state is saved in the storage', () => {
    beforeEach(() => {
      mockRulesTablePersistedState({ urlState: null, storageState: storageSavedState });
    });

    it('restores the state', () => {
      renderHook(() => useInitializeRulesTableSavedState());

      expect(actions.setFilterOptions).toHaveBeenCalledWith({
        filter: storageSavedState.searchTerm,
        showCustomRules: storageSavedState.showCustomRules,
        showElasticRules: !storageSavedState.showCustomRules,
        tags: storageSavedState.tags,
      });
      expect(actions.setSortingOptions).toHaveBeenCalledWith(storageSavedState.sort);
      expect(actions.setPage).toHaveBeenCalledWith(storageSavedState.page);
      expect(actions.setPerPage).toHaveBeenCalledWith(storageSavedState.perPage);
    });

    it('restores the state ignoring negative page size', () => {
      mockRulesTablePersistedState({
        urlState: null,
        storageState: { ...storageSavedState, perPage: -1 },
      });

      renderHook(() => useInitializeRulesTableSavedState());

      expect(actions.setPerPage).not.toHaveBeenCalled();
    });

    it('restores the state ignoring the page size larger than max allowed', () => {
      mockRulesTablePersistedState({
        urlState: null,
        storageState: { ...storageSavedState, perPage: RULES_TABLE_MAX_PAGE_SIZE + 1 },
      });

      renderHook(() => useInitializeRulesTableSavedState());

      expect(actions.setPerPage).not.toHaveBeenCalled();
    });
  });

  describe('when partial state is saved in the storage', () => {
    it('restores only the search term', () => {
      mockRulesTablePersistedState({ urlState: null, storageState: { searchTerm: 'test' } });

      renderHook(() => useInitializeRulesTableSavedState());

      expect(actions.setFilterOptions).toHaveBeenCalledWith({
        ...DEFAULT_FILTER_OPTIONS,
        filter: 'test',
      });
      expect(actions.setSortingOptions).not.toHaveBeenCalled();
      expect(actions.setPage).not.toHaveBeenCalled();
      expect(actions.setPerPage).not.toHaveBeenCalled();
    });

    it('restores only show elastic rules filter', () => {
      mockRulesTablePersistedState({ urlState: null, storageState: { showCustomRules: false } });

      renderHook(() => useInitializeRulesTableSavedState());

      expect(actions.setFilterOptions).toHaveBeenCalledWith({
        ...DEFAULT_FILTER_OPTIONS,
        showElasticRules: true,
      });
      expect(actions.setSortingOptions).not.toHaveBeenCalled();
      expect(actions.setPage).not.toHaveBeenCalled();
      expect(actions.setPerPage).not.toHaveBeenCalled();
    });

    it('restores only show custom rules filter', () => {
      mockRulesTablePersistedState({ urlState: null, storageState: { showCustomRules: true } });

      renderHook(() => useInitializeRulesTableSavedState());

      expect(actions.setFilterOptions).toHaveBeenCalledWith({
        ...DEFAULT_FILTER_OPTIONS,
        showCustomRules: true,
      });
      expect(actions.setSortingOptions).not.toHaveBeenCalled();
      expect(actions.setPage).not.toHaveBeenCalled();
      expect(actions.setPerPage).not.toHaveBeenCalled();
    });

    it('restores only tags', () => {
      mockRulesTablePersistedState({ urlState: null, storageState: { tags: ['test'] } });

      renderHook(() => useInitializeRulesTableSavedState());

      expect(actions.setFilterOptions).toHaveBeenCalledWith({
        ...DEFAULT_FILTER_OPTIONS,
        tags: ['test'],
      });
      expect(actions.setSortingOptions).not.toHaveBeenCalled();
      expect(actions.setPage).not.toHaveBeenCalled();
      expect(actions.setPerPage).not.toHaveBeenCalled();
    });

    it('restores only sorting field', () => {
      mockRulesTablePersistedState({ urlState: null, storageState: { sort: { field: 'name' } } });

      renderHook(() => useInitializeRulesTableSavedState());

      expect(actions.setFilterOptions).toHaveBeenCalledWith(DEFAULT_FILTER_OPTIONS);
      expect(actions.setSortingOptions).toHaveBeenCalledWith({
        field: 'name',
        order: DEFAULT_SORTING_OPTIONS.order,
      });
      expect(actions.setPage).not.toHaveBeenCalled();
      expect(actions.setPerPage).not.toHaveBeenCalled();
    });

    it('restores only sorting order', () => {
      mockRulesTablePersistedState({ urlState: null, storageState: { sort: { order: 'asc' } } });

      renderHook(() => useInitializeRulesTableSavedState());

      expect(actions.setFilterOptions).toHaveBeenCalledWith(DEFAULT_FILTER_OPTIONS);
      expect(actions.setSortingOptions).toHaveBeenCalledWith({
        field: DEFAULT_SORTING_OPTIONS.field,
        order: 'asc',
      });
      expect(actions.setPage).not.toHaveBeenCalled();
      expect(actions.setPerPage).not.toHaveBeenCalled();
    });

    it('restores only page number', () => {
      mockRulesTablePersistedState({ urlState: null, storageState: { page: 10 } });

      renderHook(() => useInitializeRulesTableSavedState());

      expect(actions.setFilterOptions).toHaveBeenCalledWith(DEFAULT_FILTER_OPTIONS);
      expect(actions.setSortingOptions).not.toHaveBeenCalled();
      expect(actions.setPage).toHaveBeenCalledWith(10);
      expect(actions.setPerPage).not.toHaveBeenCalled();
    });

    it('restores only page size', () => {
      mockRulesTablePersistedState({ urlState: null, storageState: { perPage: 10 } });

      renderHook(() => useInitializeRulesTableSavedState());

      expect(actions.setFilterOptions).toHaveBeenCalledWith(DEFAULT_FILTER_OPTIONS);
      expect(actions.setSortingOptions).not.toHaveBeenCalled();
      expect(actions.setPage).not.toHaveBeenCalled();
      expect(actions.setPerPage).toHaveBeenCalledWith(10);
    });
  });

  describe('when state is saved in the url and the storage', () => {
    beforeEach(() => {
      mockRulesTablePersistedState({ urlState: urlSavedState, storageState: storageSavedState });
    });

    it('restores the state from the url', () => {
      renderHook(() => useInitializeRulesTableSavedState());

      expect(actions.setFilterOptions).toHaveBeenCalledWith({
        filter: urlSavedState.searchTerm,
        showCustomRules: urlSavedState.showCustomRules,
        showElasticRules: !urlSavedState.showCustomRules,
        tags: urlSavedState.tags,
      });
      expect(actions.setSortingOptions).toHaveBeenCalledWith(urlSavedState.sort);
      expect(actions.setPage).toHaveBeenCalledWith(urlSavedState.page);
      expect(actions.setPerPage).toHaveBeenCalledWith(urlSavedState.perPage);
    });
  });

  describe('when partial state is saved in the url and in the storage', () => {
    it('restores only the search term', () => {
      mockRulesTablePersistedState({
        urlState: { searchTerm: 'test' },
        storageState: { sort: { field: 'name' } },
      });

      renderHook(() => useInitializeRulesTableSavedState());

      expect(actions.setFilterOptions).toHaveBeenCalledWith({
        ...DEFAULT_FILTER_OPTIONS,
        filter: 'test',
      });
      expect(actions.setSortingOptions).toHaveBeenCalledWith({
        ...DEFAULT_SORTING_OPTIONS,
        field: 'name',
      });
    });
  });
});
