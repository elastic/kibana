/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react-hooks';
import { useKibana } from '../../../../../common/lib/kibana';
import { useInitializeUrlParam } from '../../../../../common/utils/global_query_string';
import { useInitializeRulesTableSavedState } from './use_initialize_rules_table_saved_state';
import type { RulesTableActions } from './rules_table_context';
import { useRulesTableContext } from './rules_table_context';
import type { RulesTableSavedState } from './rules_table_saved_state';

jest.mock('../../../../../common/lib/kibana');
jest.mock('../../../../../common/utils/global_query_string');
jest.mock('./rules_table_context');

function mockState({
  urlState,
  storageState,
}: {
  urlState: RulesTableSavedState | null;
  storageState: RulesTableSavedState | null;
}): void {
  (useInitializeUrlParam as jest.Mock).mockImplementation(
    (_, cb: (params: RulesTableSavedState | null) => void) => cb(urlState)
  );
  (useKibana as jest.Mock).mockReturnValue({
    services: { storage: { get: jest.fn().mockReturnValue(storageState) } },
  });
}

describe('useInitializeRulesTableSavedState', () => {
  const urlSavedState: RulesTableSavedState = {
    tab: 'monitoring',
    isInMemorySorting: false,
    filterOptions: {
      filter: '',
      showCustomRules: false,
      showElasticRules: false,
      tags: [],
    },
    sorting: {
      field: 'name',
      order: 'desc',
    },
    page: 2,
    perPage: 10,
  };
  const storageSavedState: RulesTableSavedState = {
    isInMemorySorting: true,
    filterOptions: {
      filter: 'test',
      showCustomRules: false,
      showElasticRules: true,
      tags: [],
    },
    sorting: {
      field: 'name',
      order: 'asc',
    },
    page: 1,
    perPage: 20,
  };
  let actions: Partial<RulesTableActions>;
  let setActiveTab: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    actions = {
      setIsInMemorySorting: jest.fn(),
      setFilterOptions: jest.fn(),
      setSortingOptions: jest.fn(),
      setPage: jest.fn(),
      setPerPage: jest.fn(),
    };
    setActiveTab = jest.fn();

    (useRulesTableContext as jest.Mock).mockReturnValue({ actions });
  });

  describe('when state is not saved', () => {
    beforeEach(() => {
      mockState({ urlState: null, storageState: null });
    });

    it('does not restore the state', () => {
      renderHook(() => useInitializeRulesTableSavedState(setActiveTab));

      expect(setActiveTab).not.toHaveBeenCalled();
      expect(actions.setIsInMemorySorting).not.toHaveBeenCalled();
      expect(actions.setFilterOptions).not.toHaveBeenCalled();
      expect(actions.setSortingOptions).not.toHaveBeenCalled();
      expect(actions.setPage).not.toHaveBeenCalled();
      expect(actions.setPerPage).not.toHaveBeenCalled();
    });
  });

  describe('when state is saved in the url', () => {
    beforeEach(() => {
      mockState({ urlState: urlSavedState, storageState: null });
    });

    it('restores the state', () => {
      renderHook(() => useInitializeRulesTableSavedState(setActiveTab));

      expect(setActiveTab).toHaveBeenCalledWith('monitoring');
      expect(actions.setIsInMemorySorting).toHaveBeenCalledWith(urlSavedState.isInMemorySorting);
      expect(actions.setFilterOptions).toHaveBeenCalledWith(urlSavedState.filterOptions);
      expect(actions.setSortingOptions).toHaveBeenCalledWith(urlSavedState.sorting);
      expect(actions.setPage).toHaveBeenCalledWith(urlSavedState.page);
      expect(actions.setPerPage).toHaveBeenCalledWith(urlSavedState.perPage);
    });
  });

  describe('when state is saved in the storage', () => {
    beforeEach(() => {
      mockState({ urlState: null, storageState: storageSavedState });
    });

    it('restores the state', () => {
      renderHook(() => useInitializeRulesTableSavedState(setActiveTab));

      expect(setActiveTab).not.toHaveBeenCalled();
      expect(actions.setIsInMemorySorting).toHaveBeenCalledWith(
        storageSavedState.isInMemorySorting
      );
      expect(actions.setFilterOptions).toHaveBeenCalledWith(storageSavedState.filterOptions);
      expect(actions.setSortingOptions).toHaveBeenCalledWith(storageSavedState.sorting);
      expect(actions.setPage).toHaveBeenCalledWith(storageSavedState.page);
      expect(actions.setPerPage).toHaveBeenCalledWith(storageSavedState.perPage);
    });
  });

  describe('when state is saved in the url and the storage', () => {
    beforeEach(() => {
      mockState({ urlState: urlSavedState, storageState: storageSavedState });
    });

    it('restores the state from the url', () => {
      renderHook(() => useInitializeRulesTableSavedState(setActiveTab));

      expect(setActiveTab).toHaveBeenCalledWith('monitoring');
      expect(actions.setIsInMemorySorting).toHaveBeenCalledWith(urlSavedState.isInMemorySorting);
      expect(actions.setFilterOptions).toHaveBeenCalledWith(urlSavedState.filterOptions);
      expect(actions.setSortingOptions).toHaveBeenCalledWith(urlSavedState.sorting);
      expect(actions.setPage).toHaveBeenCalledWith(urlSavedState.page);
      expect(actions.setPerPage).toHaveBeenCalledWith(urlSavedState.perPage);
    });
  });
});
