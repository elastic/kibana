/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { RuleDetailsContextType } from '../rule_details_context';
import { RuleDetailTabs } from '..';

export const useRuleDetailsContextMock = {
  create: (): jest.Mocked<RuleDetailsContextType> => ({
    [RuleDetailTabs.executionResults]: {
      state: {
        superDatePicker: {
          recentlyUsedRanges: [],
          refreshInterval: 1000,
          isPaused: true,
          start: 'now-24h',
          end: 'now',
        },
        queryText: '',
        statusFilters: [],
        showMetricColumns: true,
        pagination: {
          pageIndex: 1,
          pageSize: 5,
        },
        sort: {
          sortField: 'timestamp',
          sortDirection: 'desc',
        },
      },
      actions: {
        setEnd: jest.fn(),
        setIsPaused: jest.fn(),
        setPageIndex: jest.fn(),
        setPageSize: jest.fn(),
        setQueryText: jest.fn(),
        setRecentlyUsedRanges: jest.fn(),
        setRefreshInterval: jest.fn(),
        setShowMetricColumns: jest.fn(),
        setSortDirection: jest.fn(),
        setSortField: jest.fn(),
        setStart: jest.fn(),
        setStatusFilters: jest.fn(),
      },
    },
  }),
};

// do not delete
export const useRuleDetailsContext = jest
  .fn<jest.Mocked<RuleDetailsContextType>, []>()
  .mockImplementation(useRuleDetailsContextMock.create);

// do not delete
export const useRuleDetailsContextOptional = jest
  .fn<jest.Mocked<RuleDetailsContextType>, []>()
  .mockImplementation(useRuleDetailsContextMock.create);

// do not delete
export const RulesTableContextProvider = jest
  .fn()
  .mockImplementation(({ children }: { children: React.ReactNode }) => <>{children}</>);
