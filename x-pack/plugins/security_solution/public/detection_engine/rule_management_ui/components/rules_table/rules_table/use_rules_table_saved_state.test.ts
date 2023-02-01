/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react-hooks';
import { RULES_TABLE_MAX_PAGE_SIZE } from '../../../../../../common/constants';
import type {
  RulesTableStorageSavedState,
  RulesTableUrlSavedState,
} from './rules_table_saved_state';
import { RuleSource } from './rules_table_saved_state';
import { mockRulesTablePersistedState } from './__mocks__/mock_rules_table_persistent_state';
import { useRulesTableSavedState } from './use_rules_table_saved_state';

jest.mock('../../../../../common/lib/kibana');
jest.mock('../../../../../common/utils/global_query_string/helpers');
jest.mock('./rules_table_context');

describe('useRulesTableSavedState', () => {
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

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('when the state is not saved', () => {
    beforeEach(() => {
      mockRulesTablePersistedState({ urlState: null, storageState: null });
    });

    it('does not return the state', () => {
      const {
        result: { current: currentResult },
      } = renderHook(() => useRulesTableSavedState());

      expect(currentResult).toEqual({});
    });
  });

  describe('when the state is saved in the url', () => {
    beforeEach(() => {
      mockRulesTablePersistedState({ urlState: urlSavedState, storageState: null });
    });

    it('returns the state', () => {
      const {
        result: {
          current: { filter, sorting, pagination },
        },
      } = renderHook(() => useRulesTableSavedState());

      expect(filter?.searchTerm).toBe(urlSavedState.searchTerm);
      expect(filter?.source).toBe(urlSavedState.source);
      expect(filter?.tags).toBe(urlSavedState.tags);
      expect(sorting?.field).toBe(urlSavedState.field);
      expect(sorting?.order).toBe(urlSavedState.order);
      expect(pagination?.page).toBe(urlSavedState.page);
      expect(pagination?.perPage).toBe(urlSavedState.perPage);
    });

    it('returns the state ignoring negative page size', () => {
      mockRulesTablePersistedState({
        urlState: { ...urlSavedState, perPage: -1 },
        storageState: null,
      });

      const {
        result: {
          current: { filter, sorting, pagination },
        },
      } = renderHook(() => useRulesTableSavedState());

      expect(filter?.searchTerm).toBe(urlSavedState.searchTerm);
      expect(filter?.source).toBe(urlSavedState.source);
      expect(filter?.tags).toBe(urlSavedState.tags);
      expect(sorting?.field).toBe(urlSavedState.field);
      expect(sorting?.order).toBe(urlSavedState.order);
      expect(pagination?.page).toBeUndefined();
      expect(pagination?.perPage).toBeUndefined();
    });

    it('returns the state ignoring the page size larger than max allowed', () => {
      mockRulesTablePersistedState({
        urlState: { ...urlSavedState, perPage: RULES_TABLE_MAX_PAGE_SIZE + 1 },
        storageState: null,
      });

      const {
        result: {
          current: { filter, sorting, pagination },
        },
      } = renderHook(() => useRulesTableSavedState());

      expect(filter?.searchTerm).toBe(urlSavedState.searchTerm);
      expect(filter?.source).toBe(urlSavedState.source);
      expect(filter?.tags).toBe(urlSavedState.tags);
      expect(sorting?.field).toBe(urlSavedState.field);
      expect(sorting?.order).toBe(urlSavedState.order);
      expect(pagination?.page).toBe(urlSavedState.page);
      expect(pagination?.perPage).toBeUndefined();
    });
  });

  describe('when the partial state is saved in the url', () => {
    it('returns only the search term', () => {
      mockRulesTablePersistedState({ urlState: { searchTerm: 'test' }, storageState: null });

      const {
        result: {
          current: { filter, sorting, pagination },
        },
      } = renderHook(() => useRulesTableSavedState());

      expect(filter?.searchTerm).toBe(urlSavedState.searchTerm);
      expect(filter?.source).toBeUndefined();
      expect(filter?.tags).toBeUndefined();
      expect(sorting?.field).toBeUndefined();
      expect(sorting?.order).toBeUndefined();
      expect(pagination?.page).toBeUndefined();
      expect(pagination?.perPage).toBeUndefined();
    });

    it('returns only show prebuilt rules filter', () => {
      mockRulesTablePersistedState({
        urlState: { source: RuleSource.Elastic },
        storageState: null,
      });

      const {
        result: {
          current: { filter, sorting, pagination },
        },
      } = renderHook(() => useRulesTableSavedState());

      expect(filter?.searchTerm).toBeUndefined();
      expect(filter?.source).toBe(RuleSource.Elastic);
      expect(filter?.tags).toBeUndefined();
      expect(sorting?.field).toBeUndefined();
      expect(sorting?.order).toBeUndefined();
      expect(pagination?.page).toBeUndefined();
      expect(pagination?.perPage).toBeUndefined();
    });

    it('returns only show custom rules filter', () => {
      mockRulesTablePersistedState({ urlState: { source: RuleSource.Custom }, storageState: null });

      const {
        result: {
          current: { filter, sorting, pagination },
        },
      } = renderHook(() => useRulesTableSavedState());

      expect(filter?.searchTerm).toBeUndefined();
      expect(filter?.source).toBe(RuleSource.Custom);
      expect(filter?.tags).toBeUndefined();
      expect(sorting?.field).toBeUndefined();
      expect(sorting?.order).toBeUndefined();
      expect(pagination?.page).toBeUndefined();
      expect(pagination?.perPage).toBeUndefined();
    });

    it('returns only tags', () => {
      mockRulesTablePersistedState({ urlState: { tags: ['test'] }, storageState: null });

      const {
        result: {
          current: { filter, sorting, pagination },
        },
      } = renderHook(() => useRulesTableSavedState());

      expect(filter?.searchTerm).toBeUndefined();
      expect(filter?.source).toBeUndefined();
      expect(filter?.tags).toEqual(['test']);
      expect(sorting?.field).toBeUndefined();
      expect(sorting?.order).toBeUndefined();
      expect(pagination?.page).toBeUndefined();
      expect(pagination?.perPage).toBeUndefined();
    });

    it('returns only sorting field', () => {
      mockRulesTablePersistedState({ urlState: { field: 'name' }, storageState: null });

      const {
        result: {
          current: { filter, sorting, pagination },
        },
      } = renderHook(() => useRulesTableSavedState());

      expect(filter?.searchTerm).toBeUndefined();
      expect(filter?.source).toBeUndefined();
      expect(filter?.tags).toBeUndefined();
      expect(sorting?.field).toBe('name');
      expect(sorting?.order).toBeUndefined();
      expect(pagination?.page).toBeUndefined();
      expect(pagination?.perPage).toBeUndefined();
    });

    it('returns only sorting order', () => {
      mockRulesTablePersistedState({ urlState: { order: 'asc' }, storageState: null });

      const {
        result: {
          current: { filter, sorting, pagination },
        },
      } = renderHook(() => useRulesTableSavedState());

      expect(filter?.searchTerm).toBeUndefined();
      expect(filter?.source).toBeUndefined();
      expect(filter?.tags).toBeUndefined();
      expect(sorting?.field).toBeUndefined();
      expect(sorting?.order).toBe('asc');
      expect(pagination?.page).toBeUndefined();
      expect(pagination?.perPage).toBeUndefined();
    });

    it('returns only page number', () => {
      mockRulesTablePersistedState({ urlState: { page: 10 }, storageState: null });

      const {
        result: {
          current: { filter, sorting, pagination },
        },
      } = renderHook(() => useRulesTableSavedState());

      expect(filter?.searchTerm).toBeUndefined();
      expect(filter?.source).toBeUndefined();
      expect(filter?.tags).toBeUndefined();
      expect(sorting?.field).toBeUndefined();
      expect(sorting?.order).toBeUndefined();
      expect(pagination?.page).toBe(10);
      expect(pagination?.perPage).toBeUndefined();
    });

    it('returns only page size', () => {
      mockRulesTablePersistedState({ urlState: { perPage: 10 }, storageState: null });

      const {
        result: {
          current: { filter, sorting, pagination },
        },
      } = renderHook(() => useRulesTableSavedState());

      expect(filter?.searchTerm).toBeUndefined();
      expect(filter?.source).toBeUndefined();
      expect(filter?.tags).toBeUndefined();
      expect(sorting?.field).toBeUndefined();
      expect(sorting?.order).toBeUndefined();
      expect(pagination?.page).toBeUndefined();
      expect(pagination?.perPage).toBe(10);
    });
  });

  describe('when state is saved in the storage', () => {
    beforeEach(() => {
      mockRulesTablePersistedState({ urlState: null, storageState: storageSavedState });
    });

    it('returns the state', () => {
      const {
        result: {
          current: { filter, sorting, pagination },
        },
      } = renderHook(() => useRulesTableSavedState());

      expect(filter?.searchTerm).toBe(storageSavedState.searchTerm);
      expect(filter?.source).toBe(storageSavedState.source);
      expect(filter?.tags).toBe(storageSavedState.tags);
      expect(sorting?.field).toBe(storageSavedState.field);
      expect(sorting?.order).toBe(storageSavedState.order);
      expect(pagination?.page).toBeUndefined();
      expect(pagination?.perPage).toBe(storageSavedState.perPage);
    });

    it('returns the state ignoring negative page size', () => {
      mockRulesTablePersistedState({
        urlState: null,
        storageState: { ...storageSavedState, perPage: -1 },
      });

      const {
        result: {
          current: { filter, sorting, pagination },
        },
      } = renderHook(() => useRulesTableSavedState());

      expect(filter?.searchTerm).toBe(storageSavedState.searchTerm);
      expect(filter?.source).toBe(storageSavedState.source);
      expect(filter?.tags).toBe(storageSavedState.tags);
      expect(sorting?.field).toBe(storageSavedState.field);
      expect(sorting?.order).toBe(storageSavedState.order);
      expect(pagination?.page).toBeUndefined();
      expect(pagination?.perPage).toBeUndefined();
    });

    it('returns the state ignoring the page size larger than max allowed', () => {
      mockRulesTablePersistedState({
        urlState: null,
        storageState: { ...storageSavedState, perPage: RULES_TABLE_MAX_PAGE_SIZE + 1 },
      });

      const {
        result: {
          current: { filter, sorting, pagination },
        },
      } = renderHook(() => useRulesTableSavedState());

      expect(filter?.searchTerm).toBe(storageSavedState.searchTerm);
      expect(filter?.source).toBe(storageSavedState.source);
      expect(filter?.tags).toBe(storageSavedState.tags);
      expect(sorting?.field).toBe(storageSavedState.field);
      expect(sorting?.order).toBe(storageSavedState.order);
      expect(pagination?.page).toBeUndefined();
      expect(pagination?.perPage).toBeUndefined();
    });
  });

  describe('when partial state is saved in the storage', () => {
    it('returns only the search term', () => {
      mockRulesTablePersistedState({ urlState: null, storageState: { searchTerm: 'test' } });

      const {
        result: {
          current: { filter, sorting, pagination },
        },
      } = renderHook(() => useRulesTableSavedState());

      expect(filter?.searchTerm).toBe('test');
      expect(filter?.source).toBeUndefined();
      expect(filter?.tags).toBeUndefined();
      expect(sorting?.field).toBeUndefined();
      expect(sorting?.order).toBeUndefined();
      expect(pagination?.page).toBeUndefined();
      expect(pagination?.perPage).toBeUndefined();
    });

    it('returns only show prebuilt rules filter', () => {
      mockRulesTablePersistedState({
        urlState: null,
        storageState: { source: RuleSource.Elastic },
      });

      const {
        result: {
          current: { filter, sorting, pagination },
        },
      } = renderHook(() => useRulesTableSavedState());

      expect(filter?.searchTerm).toBeUndefined();
      expect(filter?.source).toBe(RuleSource.Elastic);
      expect(filter?.tags).toBeUndefined();
      expect(sorting?.field).toBeUndefined();
      expect(sorting?.order).toBeUndefined();
      expect(pagination?.page).toBeUndefined();
      expect(pagination?.perPage).toBeUndefined();
    });

    it('returns only show custom rules filter', () => {
      mockRulesTablePersistedState({ urlState: null, storageState: { source: RuleSource.Custom } });

      const {
        result: {
          current: { filter, sorting, pagination },
        },
      } = renderHook(() => useRulesTableSavedState());

      expect(filter?.searchTerm).toBeUndefined();
      expect(filter?.source).toBe(RuleSource.Custom);
      expect(filter?.tags).toBeUndefined();
      expect(sorting?.field).toBeUndefined();
      expect(sorting?.order).toBeUndefined();
      expect(pagination?.page).toBeUndefined();
      expect(pagination?.perPage).toBeUndefined();
    });

    it('returns only tags', () => {
      mockRulesTablePersistedState({ urlState: null, storageState: { tags: ['test'] } });

      const {
        result: {
          current: { filter, sorting, pagination },
        },
      } = renderHook(() => useRulesTableSavedState());

      expect(filter?.searchTerm).toBeUndefined();
      expect(filter?.source).toBeUndefined();
      expect(filter?.tags).toEqual(['test']);
      expect(sorting?.field).toBeUndefined();
      expect(sorting?.order).toBeUndefined();
      expect(pagination?.page).toBeUndefined();
      expect(pagination?.perPage).toBeUndefined();
    });

    it('returns only sorting field', () => {
      mockRulesTablePersistedState({ urlState: null, storageState: { field: 'name' } });

      const {
        result: {
          current: { filter, sorting, pagination },
        },
      } = renderHook(() => useRulesTableSavedState());

      expect(filter?.searchTerm).toBeUndefined();
      expect(filter?.source).toBeUndefined();
      expect(filter?.tags).toBeUndefined();
      expect(sorting?.field).toBe('name');
      expect(sorting?.order).toBeUndefined();
      expect(pagination?.page).toBeUndefined();
      expect(pagination?.perPage).toBeUndefined();
    });

    it('returns only sorting order', () => {
      mockRulesTablePersistedState({ urlState: null, storageState: { order: 'asc' } });

      const {
        result: {
          current: { filter, sorting, pagination },
        },
      } = renderHook(() => useRulesTableSavedState());

      expect(filter?.searchTerm).toBeUndefined();
      expect(filter?.source).toBeUndefined();
      expect(filter?.tags).toBeUndefined();
      expect(sorting?.field).toBeUndefined();
      expect(sorting?.order).toBe('asc');
      expect(pagination?.page).toBeUndefined();
      expect(pagination?.perPage).toBeUndefined();
    });

    it('does not return the page number', () => {
      mockRulesTablePersistedState({
        urlState: null,
        // @ts-expect-error Passing an invalid value for the test
        storageState: { page: 10 },
      });

      const {
        result: {
          current: { filter, sorting, pagination },
        },
      } = renderHook(() => useRulesTableSavedState());

      expect(filter?.searchTerm).toBeUndefined();
      expect(filter?.source).toBeUndefined();
      expect(filter?.tags).toBeUndefined();
      expect(sorting?.field).toBeUndefined();
      expect(sorting?.order).toBeUndefined();
      expect(pagination?.page).toBeUndefined();
      expect(pagination?.perPage).toBeUndefined();
    });

    it('returns only page size', () => {
      mockRulesTablePersistedState({ urlState: null, storageState: { perPage: 10 } });

      const {
        result: {
          current: { filter, sorting, pagination },
        },
      } = renderHook(() => useRulesTableSavedState());

      expect(filter?.searchTerm).toBeUndefined();
      expect(filter?.source).toBeUndefined();
      expect(filter?.tags).toBeUndefined();
      expect(sorting?.field).toBeUndefined();
      expect(sorting?.order).toBeUndefined();
      expect(pagination?.page).toBeUndefined();
      expect(pagination?.perPage).toBe(10);
    });
  });

  describe('when state is saved in the url and the storage', () => {
    beforeEach(() => {
      mockRulesTablePersistedState({ urlState: urlSavedState, storageState: storageSavedState });
    });

    it('returns the state from the url', () => {
      const {
        result: {
          current: { filter, sorting, pagination },
        },
      } = renderHook(() => useRulesTableSavedState());

      expect(filter?.searchTerm).toBe(urlSavedState.searchTerm);
      expect(filter?.source).toBe(urlSavedState.source);
      expect(filter?.tags).toBe(urlSavedState.tags);
      expect(sorting?.field).toBe(urlSavedState.field);
      expect(sorting?.order).toBe(urlSavedState.order);
      expect(pagination?.page).toBe(urlSavedState.page);
      expect(pagination?.perPage).toBe(urlSavedState.perPage);
    });
  });

  describe('when partial state is saved in the url and in the storage', () => {
    it('returns only the search term', () => {
      mockRulesTablePersistedState({
        urlState: { searchTerm: 'test' },
        storageState: { field: 'name' },
      });

      const {
        result: {
          current: { filter, sorting, pagination },
        },
      } = renderHook(() => useRulesTableSavedState());

      expect(filter?.searchTerm).toBe('test');
      expect(filter?.source).toBeUndefined();
      expect(filter?.tags).toBeUndefined();
      expect(sorting?.field).toBe('name');
      expect(sorting?.order).toBeUndefined();
      expect(pagination?.page).toBeUndefined();
      expect(pagination?.perPage).toBeUndefined();
    });
  });

  describe('when there is invalid state in the url', () => {
    it('does not return the filter', () => {
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

      const {
        result: {
          current: { filter, sorting, pagination },
        },
      } = renderHook(() => useRulesTableSavedState());

      expect(filter?.searchTerm).toBeUndefined();
      expect(filter?.source).toBeUndefined();
      expect(filter?.tags).toBeUndefined();
      expect(sorting?.field).toBe('name');
      expect(sorting?.order).toBe('asc');
      expect(pagination?.page).toBe(2);
      expect(pagination?.perPage).toBe(10);
    });

    it('does not return the sorting', () => {
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

      const {
        result: {
          current: { filter, sorting, pagination },
        },
      } = renderHook(() => useRulesTableSavedState());

      expect(filter?.searchTerm).toBe('test');
      expect(filter?.source).toBe(RuleSource.Custom);
      expect(filter?.tags).toEqual(['test']);
      expect(sorting?.field).toBeUndefined();
      expect(sorting?.order).toBeUndefined();
      expect(pagination?.page).toBe(2);
      expect(pagination?.perPage).toBe(10);
    });

    it('does not return the pagination', () => {
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

      const {
        result: {
          current: { filter, sorting, pagination },
        },
      } = renderHook(() => useRulesTableSavedState());

      expect(filter?.searchTerm).toBe('test');
      expect(filter?.source).toBe(RuleSource.Custom);
      expect(filter?.tags).toEqual(['test']);
      expect(sorting?.field).toBe('name');
      expect(sorting?.order).toBe('asc');
      expect(pagination?.page).toBeUndefined();
      expect(pagination?.perPage).toBeUndefined();
    });
  });

  describe('when there is invalid state in the storage', () => {
    it('does not return the filter', () => {
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

      const {
        result: {
          current: { filter, sorting, pagination },
        },
      } = renderHook(() => useRulesTableSavedState());

      expect(filter?.searchTerm).toBeUndefined();
      expect(filter?.source).toBeUndefined();
      expect(filter?.tags).toBeUndefined();
      expect(sorting?.field).toBe('name');
      expect(sorting?.order).toBe('asc');
      expect(pagination?.page).toBeUndefined();
      expect(pagination?.perPage).toBe(10);
    });

    it('does not return the sorting', () => {
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

      const {
        result: {
          current: { filter, sorting, pagination },
        },
      } = renderHook(() => useRulesTableSavedState());

      expect(filter?.searchTerm).toBe('test');
      expect(filter?.source).toBe(RuleSource.Custom);
      expect(filter?.tags).toEqual(['test']);
      expect(sorting?.field).toBeUndefined();
      expect(sorting?.order).toBeUndefined();
      expect(pagination?.page).toBeUndefined();
      expect(pagination?.perPage).toBe(10);
    });

    it('does not return the pagination', () => {
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

      const {
        result: {
          current: { filter, sorting, pagination },
        },
      } = renderHook(() => useRulesTableSavedState());

      expect(filter?.searchTerm).toBe('test');
      expect(filter?.source).toBe(RuleSource.Custom);
      expect(filter?.tags).toEqual(['test']);
      expect(sorting?.field).toBe('name');
      expect(sorting?.order).toBe('asc');
      expect(pagination?.page).toBeUndefined();
      expect(pagination?.perPage).toBeUndefined();
    });
  });
});
