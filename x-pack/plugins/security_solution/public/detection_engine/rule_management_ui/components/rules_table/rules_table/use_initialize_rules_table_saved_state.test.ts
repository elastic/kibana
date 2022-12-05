/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react-hooks';
import { RULES_TABLE_MAX_PAGE_SIZE } from '../../../../../../common/constants';
import { useRulesTableContextMock } from './__mocks__/rules_table_context';
import { useInitializeRulesTableSavedState } from './use_initialize_rules_table_saved_state';
import type {
  RulesTableStorageSavedState,
  RulesTableUrlSavedState,
} from './rules_table_saved_state';
import { RuleSource } from './rules_table_saved_state';
import { DEFAULT_FILTER_OPTIONS, DEFAULT_SORTING_OPTIONS } from './rules_table_defaults';
import { useRulesTableContext } from './rules_table_context';
import { mockRulesTablePersistedState } from './__mocks__/mock_rules_table_persistent_state';

jest.mock('../../../../../common/lib/kibana');
jest.mock('../../../../../common/utils/global_query_string/helpers');
jest.mock('./rules_table_context');

describe('useInitializeRulesTableSavedState', () => {
  const urlSavedState: RulesTableUrlSavedState = {
    searchTerm: 'test',
    source: RuleSource.Custom,
    tags: ['test'],
    field: 'name',
    order: 'asc',
    page: 2,
    perPage: 10,
  };
  const storageSavedState: RulesTableStorageSavedState = {
    searchTerm: 'test',
    source: RuleSource.Custom,
    tags: ['test'],
    field: 'name',
    order: 'asc',
    perPage: 20,
  };
  const rulesTableContext = useRulesTableContextMock.create();
  const actions = rulesTableContext.actions;

  beforeEach(() => {
    jest.clearAllMocks();
    (useRulesTableContext as jest.Mock).mockReturnValue(rulesTableContext);
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
        showCustomRules: urlSavedState.source === RuleSource.Custom,
        showElasticRules: urlSavedState.source === RuleSource.Prebuilt,
        tags: urlSavedState.tags,
      });
      expect(actions.setSortingOptions).toHaveBeenCalledWith({
        field: urlSavedState.field,
        order: urlSavedState.order,
      });
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

    it('restores only show prebuilt rules filter', () => {
      mockRulesTablePersistedState({
        urlState: { source: RuleSource.Prebuilt },
        storageState: null,
      });

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
      mockRulesTablePersistedState({ urlState: { source: RuleSource.Custom }, storageState: null });

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
      mockRulesTablePersistedState({ urlState: { field: 'name' }, storageState: null });

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
      mockRulesTablePersistedState({ urlState: { order: 'asc' }, storageState: null });

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
        showCustomRules: storageSavedState.source === RuleSource.Custom,
        showElasticRules: storageSavedState.source === RuleSource.Prebuilt,
        tags: storageSavedState.tags,
      });
      expect(actions.setSortingOptions).toHaveBeenCalledWith({
        field: storageSavedState.field,
        order: storageSavedState.order,
      });
      expect(actions.setPage).not.toHaveBeenCalled();
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

    it('restores only show prebuilt rules filter', () => {
      mockRulesTablePersistedState({
        urlState: null,
        storageState: { source: RuleSource.Prebuilt },
      });

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
      mockRulesTablePersistedState({ urlState: null, storageState: { source: RuleSource.Custom } });

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
      mockRulesTablePersistedState({ urlState: null, storageState: { field: 'name' } });

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
      mockRulesTablePersistedState({ urlState: null, storageState: { order: 'asc' } });

      renderHook(() => useInitializeRulesTableSavedState());

      expect(actions.setFilterOptions).toHaveBeenCalledWith(DEFAULT_FILTER_OPTIONS);
      expect(actions.setSortingOptions).toHaveBeenCalledWith({
        field: DEFAULT_SORTING_OPTIONS.field,
        order: 'asc',
      });
      expect(actions.setPage).not.toHaveBeenCalled();
      expect(actions.setPerPage).not.toHaveBeenCalled();
    });

    it('does not restore the page number', () => {
      mockRulesTablePersistedState({
        urlState: null,
        // @ts-expect-error Passing an invalid value for the test
        storageState: { page: 10 },
      });

      renderHook(() => useInitializeRulesTableSavedState());

      expect(actions.setFilterOptions).toHaveBeenCalledWith(DEFAULT_FILTER_OPTIONS);
      expect(actions.setSortingOptions).not.toHaveBeenCalled();
      expect(actions.setPage).not.toHaveBeenCalled();
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
        showCustomRules: urlSavedState.source === RuleSource.Custom,
        showElasticRules: urlSavedState.source === RuleSource.Prebuilt,
        tags: urlSavedState.tags,
      });
      expect(actions.setSortingOptions).toHaveBeenCalledWith({
        field: urlSavedState.field,
        order: urlSavedState.order,
      });
      expect(actions.setPage).toHaveBeenCalledWith(urlSavedState.page);
      expect(actions.setPerPage).toHaveBeenCalledWith(urlSavedState.perPage);
    });
  });

  describe('when partial state is saved in the url and in the storage', () => {
    it('restores only the search term', () => {
      mockRulesTablePersistedState({
        urlState: { searchTerm: 'test' },
        storageState: { field: 'name' },
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

  describe('when there is invalid state in the url', () => {
    it('does not restore the filter', () => {
      mockRulesTablePersistedState({
        urlState: {
          searchTerm: 'test',
          source: RuleSource.Custom,
          // @ts-expect-error Passing an invalid value for the test
          tags: [1, 2, 3],
          field: 'name',
          order: 'asc',
          page: 2,
          perPage: 10,
        },
        storageState: null,
      });

      renderHook(() => useInitializeRulesTableSavedState());

      expect(actions.setFilterOptions).toHaveBeenCalledWith({
        filter: '',
        showCustomRules: false,
        showElasticRules: false,
        tags: [],
      });
      expect(actions.setSortingOptions).toHaveBeenCalledWith({ field: 'name', order: 'asc' });
      expect(actions.setPage).toHaveBeenCalledWith(2);
      expect(actions.setPerPage).toHaveBeenCalledWith(10);
    });

    it('does not restore the sorting', () => {
      mockRulesTablePersistedState({
        urlState: {
          searchTerm: 'test',
          source: RuleSource.Custom,
          tags: ['test'],
          field: 'name',
          // @ts-expect-error Passing an invalid value for the test
          order: 'abc',
          page: 2,
          perPage: 10,
        },
        storageState: null,
      });

      renderHook(() => useInitializeRulesTableSavedState());

      expect(actions.setFilterOptions).toHaveBeenCalledWith({
        filter: 'test',
        showCustomRules: true,
        showElasticRules: false,
        tags: ['test'],
      });
      expect(actions.setSortingOptions).not.toHaveBeenCalled();
      expect(actions.setPage).toHaveBeenCalledWith(2);
      expect(actions.setPerPage).toHaveBeenCalledWith(10);
    });

    it('does not restore the pagination', () => {
      mockRulesTablePersistedState({
        urlState: {
          searchTerm: 'test',
          source: RuleSource.Custom,
          tags: ['test'],
          field: 'name',
          order: 'asc',
          // @ts-expect-error Passing an invalid value for the test
          page: 'aaa',
          perPage: 10,
        },
        storageState: null,
      });

      renderHook(() => useInitializeRulesTableSavedState());

      expect(actions.setFilterOptions).toHaveBeenCalledWith({
        filter: 'test',
        showCustomRules: true,
        showElasticRules: false,
        tags: ['test'],
      });
      expect(actions.setSortingOptions).toHaveBeenCalledWith({ field: 'name', order: 'asc' });
      expect(actions.setPage).not.toHaveBeenCalled();
      expect(actions.setPerPage).not.toHaveBeenCalled();
    });
  });

  describe('when there is invalid state in the storage', () => {
    it('does not restore the filter', () => {
      mockRulesTablePersistedState({
        urlState: null,
        storageState: {
          searchTerm: 'test',
          source: RuleSource.Custom,
          // @ts-expect-error Passing an invalid value for the test
          tags: [1, 2, 3],
          field: 'name',
          order: 'asc',
          perPage: 10,
        },
      });

      renderHook(() => useInitializeRulesTableSavedState());

      expect(actions.setFilterOptions).toHaveBeenCalledWith({
        filter: '',
        showCustomRules: false,
        showElasticRules: false,
        tags: [],
      });
      expect(actions.setSortingOptions).toHaveBeenCalledWith({ field: 'name', order: 'asc' });
      expect(actions.setPage).not.toHaveBeenCalled();
      expect(actions.setPerPage).toHaveBeenCalledWith(10);
    });

    it('does not restore the sorting', () => {
      mockRulesTablePersistedState({
        urlState: null,
        storageState: {
          searchTerm: 'test',
          source: RuleSource.Custom,
          tags: ['test'],
          field: 'name',
          // @ts-expect-error Passing an invalid value for the test
          order: 'abc',
          perPage: 10,
        },
      });

      renderHook(() => useInitializeRulesTableSavedState());

      expect(actions.setFilterOptions).toHaveBeenCalledWith({
        filter: 'test',
        showCustomRules: true,
        showElasticRules: false,
        tags: ['test'],
      });
      expect(actions.setSortingOptions).not.toHaveBeenCalled();
      expect(actions.setPage).not.toHaveBeenCalled();
      expect(actions.setPerPage).toHaveBeenCalledWith(10);
    });

    it('does not restore the pagination', () => {
      mockRulesTablePersistedState({
        urlState: null,
        storageState: {
          searchTerm: 'test',
          source: RuleSource.Custom,
          tags: ['test'],
          field: 'name',
          order: 'asc',
          // @ts-expect-error Passing an invalid value for the test
          perPage: 'aaa',
        },
      });

      renderHook(() => useInitializeRulesTableSavedState());

      expect(actions.setFilterOptions).toHaveBeenCalledWith({
        filter: 'test',
        showCustomRules: true,
        showElasticRules: false,
        tags: ['test'],
      });
      expect(actions.setSortingOptions).toHaveBeenCalledWith({ field: 'name', order: 'asc' });
      expect(actions.setPage).not.toHaveBeenCalled();
      expect(actions.setPerPage).not.toHaveBeenCalled();
    });
  });
});
