/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SortOrder } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { DurationRange } from '@elastic/eui/src/components/date_picker/types';
import React, { createContext, useContext, useMemo, useState } from 'react';
import { RULE_DETAILS_EXECUTION_LOG_TABLE_SHOW_METRIC_COLUMNS_STORAGE_KEY } from '../../../../../../common/constants';
import {
  AggregateRuleExecutionEvent,
  RuleExecutionStatus,
} from '../../../../../../common/detection_engine/schemas/common';
import { invariant } from '../../../../../../common/utils/invariant';
import { useKibana } from '../../../../../common/lib/kibana';
import { RuleDetailTabs } from '.';

export interface ExecutionLogTableState {
  /**
   * State of the SuperDatePicker component
   */
  superDatePicker: {
    /**
     * DateRanges to display as recently used
     */
    recentlyUsedRanges: DurationRange[];
    /**
     * Interval to auto-refresh at
     */
    refreshInterval: number;
    /**
     * State of auto-refresh
     */
    isPaused: boolean;
    /**
     * Start datetime
     */
    start: string;
    /**
     * End datetime
     */
    end: string;
  };
  /**
   * SearchBar query
   */
  queryText: string;
  /**
   * Selected Filters by Execution Status(es)
   */
  statusFilters: RuleExecutionStatus[];
  /**
   * Whether or not to show additional metric columnbs
   */
  showMetricColumns: boolean;
  /**
   * Currently selected page and number of rows per page
   */
  pagination: {
    pageIndex: number;
    pageSize: number;
  };
  sort: {
    sortField: keyof AggregateRuleExecutionEvent;
    sortDirection: SortOrder;
  };
}

// @ts-expect-error unused constant
const DEFAULT_STATE: ExecutionLogTableState = {
  superDatePicker: {
    recentlyUsedRanges: [],
    refreshInterval: 1000,
    isPaused: true,
    start: 'now-24hr',
    end: 'now',
  },
  queryText: '',
  statusFilters: [],
  showMetricColumns: false,
  pagination: {
    pageIndex: 1,
    pageSize: 5,
  },
  sort: {
    sortField: 'timestamp',
    sortDirection: 'desc',
  },
};

export interface ExecutionLogTableActions {
  setRecentlyUsedRanges: React.Dispatch<React.SetStateAction<DurationRange[]>>;
  setRefreshInterval: React.Dispatch<React.SetStateAction<number>>;
  setIsPaused: React.Dispatch<React.SetStateAction<boolean>>;
  setStart: React.Dispatch<React.SetStateAction<string>>;
  setEnd: React.Dispatch<React.SetStateAction<string>>;
  setQueryText: React.Dispatch<React.SetStateAction<string>>;
  setStatusFilters: React.Dispatch<React.SetStateAction<RuleExecutionStatus[]>>;
  setShowMetricColumns: React.Dispatch<React.SetStateAction<boolean>>;
  setPageIndex: React.Dispatch<React.SetStateAction<number>>;
  setPageSize: React.Dispatch<React.SetStateAction<number>>;
  setSortField: React.Dispatch<React.SetStateAction<keyof AggregateRuleExecutionEvent>>;
  setSortDirection: React.Dispatch<React.SetStateAction<SortOrder>>;
}

export interface RuleDetailsContextType {
  // TODO: Add section for RuleDetailTabs.exceptions and store query/pagination/etc.
  // TODO: Let's discuss how to integration with ExceptionsViewerComponent state mgmt
  [RuleDetailTabs.executionLogs]: {
    state: ExecutionLogTableState;
    actions: ExecutionLogTableActions;
  };
}

const RuleDetailsContext = createContext<RuleDetailsContextType | null>(null);

interface RuleDetailsContextProviderProps {
  children: React.ReactNode;
}

export const RuleDetailsContextProvider = ({ children }: RuleDetailsContextProviderProps) => {
  const { storage } = useKibana().services;

  // Execution Log Table tab
  // // SuperDatePicker State
  const [recentlyUsedRanges, setRecentlyUsedRanges] = useState<DurationRange[]>([]);
  const [refreshInterval, setRefreshInterval] = useState(1000);
  const [isPaused, setIsPaused] = useState(true);
  const [start, setStart] = useState('now-24h');
  const [end, setEnd] = useState('now');
  // Searchbar/Filter/Settings state
  const [queryText, setQueryText] = useState('');
  const [statusFilters, setStatusFilters] = useState<RuleExecutionStatus[]>([]);
  const [showMetricColumns, setShowMetricColumns] = useState<boolean>(
    storage.get(RULE_DETAILS_EXECUTION_LOG_TABLE_SHOW_METRIC_COLUMNS_STORAGE_KEY) ?? false
  );
  // Pagination state
  const [pageIndex, setPageIndex] = useState(1);
  const [pageSize, setPageSize] = useState(5);
  const [sortField, setSortField] = useState<keyof AggregateRuleExecutionEvent>('timestamp');
  const [sortDirection, setSortDirection] = useState<SortOrder>('desc');
  // // End Execution Log Table tab

  const providerValue = useMemo<RuleDetailsContextType>(
    () => ({
      [RuleDetailTabs.executionLogs]: {
        state: {
          superDatePicker: {
            recentlyUsedRanges,
            refreshInterval,
            isPaused,
            start,
            end,
          },
          queryText,
          statusFilters,
          showMetricColumns,
          pagination: {
            pageIndex,
            pageSize,
          },
          sort: {
            sortField,
            sortDirection,
          },
        },
        actions: {
          setEnd,
          setIsPaused,
          setPageIndex,
          setPageSize,
          setQueryText,
          setRecentlyUsedRanges,
          setRefreshInterval,
          setShowMetricColumns,
          setSortDirection,
          setSortField,
          setStart,
          setStatusFilters,
        },
      },
    }),
    [
      end,
      isPaused,
      pageIndex,
      pageSize,
      queryText,
      recentlyUsedRanges,
      refreshInterval,
      showMetricColumns,
      sortDirection,
      sortField,
      start,
      statusFilters,
    ]
  );

  return (
    <RuleDetailsContext.Provider value={providerValue}>{children}</RuleDetailsContext.Provider>
  );
};

export const useRuleDetailsContext = (): RuleDetailsContextType => {
  const ruleDetailsContext = useContext(RuleDetailsContext);
  invariant(
    ruleDetailsContext,
    'useRuleDetailsContext should be used inside RuleDetailsContextProvider'
  );

  return ruleDetailsContext;
};

export const useRuleDetailsContextOptional = (): RuleDetailsContextType | null =>
  useContext(RuleDetailsContext);
