/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
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
    enabled: true,
    field: 'name',
    order: 'asc',
    page: 2,
    perPage: 10,
  };
  const storageSavedState: RulesTableStorageSavedState = {
    searchTerm: 'test',
    source: RuleSource.Custom,
    tags: ['test'],
    enabled: false,
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

      expect(filter).toEqual({
        searchTerm: urlSavedState.searchTerm,
        source: urlSavedState.source,
        tags: urlSavedState.tags,
        enabled: urlSavedState.enabled,
      });
      expect(sorting).toEqual({
        field: urlSavedState.field,
        order: urlSavedState.order,
      });
      expect(pagination).toEqual({
        page: urlSavedState.page,
        perPage: urlSavedState.perPage,
      });
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

      expect(filter).toEqual({
        searchTerm: urlSavedState.searchTerm,
        source: urlSavedState.source,
        tags: urlSavedState.tags,
        enabled: urlSavedState.enabled,
      });
      expect(sorting).toEqual({
        field: urlSavedState.field,
        order: urlSavedState.order,
      });
      expect(pagination).toEqual({});
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

      expect(filter).toEqual({
        searchTerm: urlSavedState.searchTerm,
        source: urlSavedState.source,
        tags: urlSavedState.tags,
        enabled: urlSavedState.enabled,
      });
      expect(sorting).toEqual({
        field: urlSavedState.field,
        order: urlSavedState.order,
      });
      expect(pagination).toEqual({
        page: urlSavedState.page,
      });
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

      expect(filter).toEqual({
        searchTerm: 'test',
      });
      expect(sorting).toEqual({});
      expect(pagination).toEqual({});
    });

    it('returns only show prebuilt rules filter', () => {
      mockRulesTablePersistedState({
        urlState: { source: RuleSource.Prebuilt },
        storageState: null,
      });

      const {
        result: {
          current: { filter, sorting, pagination },
        },
      } = renderHook(() => useRulesTableSavedState());

      expect(filter).toEqual({
        source: RuleSource.Prebuilt,
      });
      expect(sorting).toEqual({});
      expect(pagination).toEqual({});
    });

    it('returns only show custom rules filter', () => {
      mockRulesTablePersistedState({ urlState: { source: RuleSource.Custom }, storageState: null });

      const {
        result: {
          current: { filter, sorting, pagination },
        },
      } = renderHook(() => useRulesTableSavedState());

      expect(filter).toEqual({
        source: RuleSource.Custom,
      });
      expect(sorting).toEqual({});
      expect(pagination).toEqual({});
    });

    it('returns only tags', () => {
      mockRulesTablePersistedState({ urlState: { tags: ['test'] }, storageState: null });

      const {
        result: {
          current: { filter, sorting, pagination },
        },
      } = renderHook(() => useRulesTableSavedState());

      expect(filter).toEqual({
        tags: ['test'],
      });
      expect(sorting).toEqual({});
      expect(pagination).toEqual({});
    });

    it('returns only enabled state', () => {
      mockRulesTablePersistedState({ urlState: { enabled: true }, storageState: null });

      const {
        result: {
          current: { filter, sorting, pagination },
        },
      } = renderHook(() => useRulesTableSavedState());

      expect(filter).toEqual({
        enabled: true,
      });
      expect(sorting).toEqual({});
      expect(pagination).toEqual({});
    });

    it('returns only sorting field', () => {
      mockRulesTablePersistedState({ urlState: { field: 'name' }, storageState: null });

      const {
        result: {
          current: { filter, sorting, pagination },
        },
      } = renderHook(() => useRulesTableSavedState());

      expect(filter).toEqual({});
      expect(sorting).toEqual({ field: 'name' });
      expect(pagination).toEqual({});
    });

    it('returns only sorting order', () => {
      mockRulesTablePersistedState({ urlState: { order: 'asc' }, storageState: null });

      const {
        result: {
          current: { filter, sorting, pagination },
        },
      } = renderHook(() => useRulesTableSavedState());

      expect(filter).toEqual({});
      expect(sorting).toEqual({ order: 'asc' });
      expect(pagination).toEqual({});
    });

    it('returns only page number', () => {
      mockRulesTablePersistedState({ urlState: { page: 10 }, storageState: null });

      const {
        result: {
          current: { filter, sorting, pagination },
        },
      } = renderHook(() => useRulesTableSavedState());

      expect(filter).toEqual({});
      expect(sorting).toEqual({});
      expect(pagination).toEqual({ page: 10 });
    });

    it('returns only page size', () => {
      mockRulesTablePersistedState({ urlState: { perPage: 10 }, storageState: null });

      const {
        result: {
          current: { filter, sorting, pagination },
        },
      } = renderHook(() => useRulesTableSavedState());

      expect(filter).toEqual({});
      expect(sorting).toEqual({});
      expect(pagination).toEqual({ perPage: 10 });
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

      expect(filter).toEqual({
        searchTerm: storageSavedState.searchTerm,
        source: storageSavedState.source,
        tags: storageSavedState.tags,
        enabled: storageSavedState.enabled,
      });
      expect(sorting).toEqual({
        field: storageSavedState.field,
        order: storageSavedState.order,
      });
      expect(pagination).toEqual({
        perPage: storageSavedState.perPage,
      });
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

      expect(filter).toEqual({
        searchTerm: storageSavedState.searchTerm,
        source: storageSavedState.source,
        tags: storageSavedState.tags,
        enabled: storageSavedState.enabled,
      });
      expect(sorting).toEqual({
        field: storageSavedState.field,
        order: storageSavedState.order,
      });
      expect(pagination).toEqual({});
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

      expect(filter).toEqual({
        searchTerm: storageSavedState.searchTerm,
        source: storageSavedState.source,
        tags: storageSavedState.tags,
        enabled: storageSavedState.enabled,
      });
      expect(sorting).toEqual({
        field: storageSavedState.field,
        order: storageSavedState.order,
      });
      expect(pagination).toEqual({});
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

      expect(filter).toEqual({
        searchTerm: 'test',
      });
      expect(sorting).toEqual({});
      expect(pagination).toEqual({});
    });

    it('returns only show prebuilt rules filter', () => {
      mockRulesTablePersistedState({
        urlState: null,
        storageState: { source: RuleSource.Prebuilt },
      });

      const {
        result: {
          current: { filter, sorting, pagination },
        },
      } = renderHook(() => useRulesTableSavedState());

      expect(filter).toEqual({
        source: RuleSource.Prebuilt,
      });
      expect(sorting).toEqual({});
      expect(pagination).toEqual({});
    });

    it('returns only show custom rules filter', () => {
      mockRulesTablePersistedState({ urlState: null, storageState: { source: RuleSource.Custom } });

      const {
        result: {
          current: { filter, sorting, pagination },
        },
      } = renderHook(() => useRulesTableSavedState());

      expect(filter).toEqual({
        source: RuleSource.Custom,
      });
      expect(sorting).toEqual({});
      expect(pagination).toEqual({});
    });

    it('returns only tags', () => {
      mockRulesTablePersistedState({ urlState: null, storageState: { tags: ['test'] } });

      const {
        result: {
          current: { filter, sorting, pagination },
        },
      } = renderHook(() => useRulesTableSavedState());

      expect(filter).toEqual({
        tags: ['test'],
      });
      expect(sorting).toEqual({});
      expect(pagination).toEqual({});
    });

    it('returns only enabled state', () => {
      mockRulesTablePersistedState({ urlState: null, storageState: { enabled: true } });

      const {
        result: {
          current: { filter, sorting, pagination },
        },
      } = renderHook(() => useRulesTableSavedState());

      expect(filter).toEqual({
        enabled: true,
      });
      expect(sorting).toEqual({});
      expect(pagination).toEqual({});
    });

    it('returns only sorting field', () => {
      mockRulesTablePersistedState({ urlState: null, storageState: { field: 'name' } });

      const {
        result: {
          current: { filter, sorting, pagination },
        },
      } = renderHook(() => useRulesTableSavedState());

      expect(filter).toEqual({});
      expect(sorting).toEqual({ field: 'name' });
      expect(pagination).toEqual({});
    });

    it('returns only sorting order', () => {
      mockRulesTablePersistedState({ urlState: null, storageState: { order: 'asc' } });

      const {
        result: {
          current: { filter, sorting, pagination },
        },
      } = renderHook(() => useRulesTableSavedState());

      expect(filter).toEqual({});
      expect(sorting).toEqual({ order: 'asc' });
      expect(pagination).toEqual({});
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

      expect(filter).toEqual({});
      expect(sorting).toEqual({});
      expect(pagination).toEqual({});
    });

    it('returns only page size', () => {
      mockRulesTablePersistedState({ urlState: null, storageState: { perPage: 10 } });

      const {
        result: {
          current: { filter, sorting, pagination },
        },
      } = renderHook(() => useRulesTableSavedState());

      expect(filter).toEqual({});
      expect(sorting).toEqual({});
      expect(pagination).toEqual({ perPage: 10 });
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

      expect(filter).toEqual({
        searchTerm: urlSavedState.searchTerm,
        source: urlSavedState.source,
        tags: urlSavedState.tags,
        enabled: urlSavedState.enabled,
      });
      expect(sorting).toEqual({
        field: urlSavedState.field,
        order: urlSavedState.order,
      });
      expect(pagination).toEqual({
        page: urlSavedState.page,
        perPage: urlSavedState.perPage,
      });
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

      expect(filter).toEqual({
        searchTerm: 'test',
      });
      expect(sorting).toEqual({
        field: 'name',
      });
      expect(pagination).toEqual({});
    });
  });

  describe('when there is invalid state in the url', () => {
    it('does not return filter when filters source has invalid value', () => {
      mockRulesTablePersistedState({
        urlState: {
          searchTerm: 'test',
          // @ts-expect-error Passing an invalid value for the test
          source: 'invalid',
          tags: ['tag-a'],
          enabled: true,
        },
        storageState: null,
      });

      const {
        result: {
          current: { filter },
        },
      } = renderHook(() => useRulesTableSavedState());

      expect(filter).toEqual({});
    });

    it('does not return filter when tags have invalid values', () => {
      mockRulesTablePersistedState({
        urlState: {
          searchTerm: 'test',
          source: RuleSource.Custom,
          // @ts-expect-error Passing an invalid value for the test
          tags: [1, 2, 3],
          enabled: true,
        },
        storageState: null,
      });

      const {
        result: {
          current: { filter },
        },
      } = renderHook(() => useRulesTableSavedState());

      expect(filter).toEqual({});
    });

    it('does not return filter when enabled state has invalid value', () => {
      mockRulesTablePersistedState({
        urlState: {
          searchTerm: 'test',
          source: RuleSource.Custom,
          tags: ['tag-a'],
          // @ts-expect-error Passing an invalid value for the test
          enabled: 10,
        },
        storageState: null,
      });

      const {
        result: {
          current: { filter },
        },
      } = renderHook(() => useRulesTableSavedState());

      expect(filter).toEqual({});
    });

    it('does not return the sorting when order has invalid value', () => {
      mockRulesTablePersistedState({
        urlState: {
          field: 'name',
          // @ts-expect-error Passing an invalid value for the test
          order: 'abc',
        },
        storageState: null,
      });

      const {
        result: {
          current: { sorting },
        },
      } = renderHook(() => useRulesTableSavedState());

      expect(sorting).toEqual({});
    });

    it('does not return the pagination when page number has invalid value', () => {
      mockRulesTablePersistedState({
        urlState: {
          // @ts-expect-error Passing an invalid value for the test
          page: 'aaa',
          perPage: 10,
        },
        storageState: null,
      });

      const {
        result: {
          current: { pagination },
        },
      } = renderHook(() => useRulesTableSavedState());

      expect(pagination).toEqual({});
    });

    it('does not return the pagination when page number has negative value', () => {
      mockRulesTablePersistedState({
        urlState: {
          page: -1,
          perPage: 10,
        },
        storageState: null,
      });

      const {
        result: {
          current: { pagination },
        },
      } = renderHook(() => useRulesTableSavedState());

      expect(pagination).toEqual({});
    });

    it('does not return the pagination when per page number has invalid value', () => {
      mockRulesTablePersistedState({
        urlState: {
          // @ts-expect-error Passing an invalid value for the test
          perPage: 'aaa',
        },
        storageState: null,
      });

      const {
        result: {
          current: { pagination },
        },
      } = renderHook(() => useRulesTableSavedState());

      expect(pagination).toEqual({});
    });

    it('does not return the pagination when per page number has negative value', () => {
      mockRulesTablePersistedState({
        urlState: {
          perPage: -1,
        },
        storageState: null,
      });

      const {
        result: {
          current: { pagination },
        },
      } = renderHook(() => useRulesTableSavedState());

      expect(pagination).toEqual({});
    });
  });

  describe('when there is invalid state in the storage', () => {
    it('does not return filter when filters source has invalid value', () => {
      mockRulesTablePersistedState({
        urlState: null,
        storageState: {
          searchTerm: 'test',
          // @ts-expect-error Passing an invalid value for the test
          source: 'invalid',
          tags: ['tag-a'],
          enabled: true,
        },
      });

      const {
        result: {
          current: { filter },
        },
      } = renderHook(() => useRulesTableSavedState());

      expect(filter).toEqual({});
    });

    it('does not return filter when tags have invalid values', () => {
      mockRulesTablePersistedState({
        urlState: null,
        storageState: {
          searchTerm: 'test',
          source: RuleSource.Custom,
          // @ts-expect-error Passing an invalid value for the test
          tags: [1, 2, 3],
          enabled: true,
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

      expect(filter).toEqual({});
      expect(sorting).toEqual({
        field: 'name',
        order: 'asc',
      });
      expect(pagination).toEqual({
        perPage: 10,
      });
    });

    it('does not return sorting when order has invalid value', () => {
      mockRulesTablePersistedState({
        urlState: null,
        storageState: {
          field: 'name',
          // @ts-expect-error Passing an invalid value for the test
          order: 'abc',
        },
      });

      const {
        result: {
          current: { sorting },
        },
      } = renderHook(() => useRulesTableSavedState());

      expect(sorting).toEqual({});
    });

    it('does not return pagination when per page has invalid value', () => {
      mockRulesTablePersistedState({
        urlState: null,
        storageState: {
          // @ts-expect-error Passing an invalid value for the test
          perPage: 'aaa',
        },
      });

      const {
        result: {
          current: { pagination },
        },
      } = renderHook(() => useRulesTableSavedState());

      expect(pagination).toEqual({});
    });

    it('does not return pagination when per page has negative value', () => {
      mockRulesTablePersistedState({
        urlState: null,
        storageState: { perPage: -1 },
      });

      const {
        result: {
          current: { pagination },
        },
      } = renderHook(() => useRulesTableSavedState());

      expect(pagination).toEqual({});
    });
  });
});
