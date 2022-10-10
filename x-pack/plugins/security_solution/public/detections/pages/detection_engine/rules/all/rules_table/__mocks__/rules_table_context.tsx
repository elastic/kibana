/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { RulesTableContextType } from '../rules_table_context';

export const useRulesTableContextMock = {
  create: (): jest.Mocked<RulesTableContextType> => ({
    state: {
      rules: [],
      pagination: {
        page: 1,
        perPage: 20,
        total: 0,
      },
      filterOptions: {
        filter: '',
        tags: [],
        showCustomRules: false,
        showElasticRules: false,
      },
      sortingOptions: {
        field: 'enabled',
        order: 'desc',
      },
      isActionInProgress: false,
      isAllSelected: false,
      isFetched: true,
      isFetching: false,
      isInMemorySorting: false,
      isLoading: false,
      isRefetching: false,
      isRefreshOn: true,
      lastUpdated: Date.now(),
      loadingRuleIds: [],
      loadingRulesAction: null,
      selectedRuleIds: [],
    },
    actions: {
      reFetchRules: jest.fn(),
      setFilterOptions: jest.fn(),
      setIsAllSelected: jest.fn(),
      setIsInMemorySorting: jest.fn(),
      setIsRefreshOn: jest.fn(),
      setLoadingRules: jest.fn(),
      setPage: jest.fn(),
      setPerPage: jest.fn(),
      setSelectedRuleIds: jest.fn(),
      setSortingOptions: jest.fn(),
      clearRulesSelection: jest.fn(),
    },
  }),
};

// do not delete
export const useRulesTableContext = jest
  .fn<jest.Mocked<RulesTableContextType>, []>()
  .mockImplementation(useRulesTableContextMock.create);
// do not delete
export const useRulesTableContextOptional = jest
  .fn<jest.Mocked<RulesTableContextType>, []>()
  .mockImplementation(useRulesTableContextMock.create);
// do not delete
export const RulesTableContextProvider = jest
  .fn()
  .mockImplementation(({ children }: { children: React.ReactNode }) => <>{children}</>);
