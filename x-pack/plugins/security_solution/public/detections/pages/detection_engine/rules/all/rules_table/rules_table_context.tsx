/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { DEFAULT_RULES_TABLE_REFRESH_SETTING } from '../../../../../../../common/constants';
import { invariant } from '../../../../../../../common/utils/invariant';
import { useKibana, useUiSetting$ } from '../../../../../../common/lib/kibana';
import {
  FilterOptions,
  PaginationOptions,
  Rule,
  SortingOptions,
} from '../../../../../containers/detection_engine/rules/types';
import { useFindRules } from './use_find_rules';
import { getRulesComparator } from './utils';

export interface RulesTableState {
  /**
   * Rules to display (sorted and paginated in case of in-memory)
   */
  rules: Rule[];
  /**
   * Currently selected table filter
   */
  filterOptions: FilterOptions;
  /**
   * Is true whenever a rule action is in progress, such as delete, duplicate, export, or load.
   */
  isActionInProgress: boolean;
  /**
   * Is true whenever all table rules are selected (with respect to the currently selected filters)
   */
  isAllSelected: boolean;
  /**
   * Will be true if the query has been fetched.
   */
  isFetched: boolean;
  /**
   * Is true whenever a request is in-flight, which includes initial loading as well as background refetches.
   */
  isFetching: boolean;
  /**
   * Is true when we store and sort all rules in-memory.
   */
  isInMemorySorting: boolean;
  /**
   * Is true then there is no cached data and the query is currently fetching.
   */
  isLoading: boolean;
  /**
   * Is true whenever a background refetch is in-flight, which does not include initial loading
   */
  isRefetching: boolean;
  /**
   * Indicates whether we should refetch table data in the background
   */
  isRefreshOn: boolean;
  /**
   * The timestamp for when the rules were successfully fetched
   */
  lastUpdated: number;
  /**
   * IDs of rules the current table action (enable, disable, delete, etc.) is affecting
   */
  loadingRuleIds: string[];
  /**
   * Indicates which rule action (enable, disable, delete, etc.) is currently in progress
   */
  loadingRulesAction: LoadingRuleAction;
  /**
   * Currently selected page and number of rows per page
   */
  pagination: PaginationOptions;
  /**
   * IDs of rules selected by a user
   */
  selectedRuleIds: string[];
  /**
   * Currently selected table sorting
   */
  sortingOptions: SortingOptions;
}

const initialFilterOptions: FilterOptions = {
  filter: '',
  tags: [],
  showCustomRules: false,
  showElasticRules: false,
};

const initialSortingOptions: SortingOptions = {
  field: 'enabled',
  order: 'desc',
};

export type LoadingRuleAction =
  | 'delete'
  | 'disable'
  | 'duplicate'
  | 'enable'
  | 'export'
  | 'load'
  | 'edit'
  | null;

export interface LoadingRules {
  ids: string[];
  action: LoadingRuleAction;
}

export interface RulesTableActions {
  reFetchRules: ReturnType<typeof useFindRules>['refetch'];
  setFilterOptions: (newFilter: Partial<FilterOptions>) => void;
  setIsAllSelected: React.Dispatch<React.SetStateAction<boolean>>;
  setIsInMemorySorting: (value: boolean) => void;
  setIsRefreshOn: React.Dispatch<React.SetStateAction<boolean>>;
  setLoadingRules: React.Dispatch<React.SetStateAction<LoadingRules>>;
  setPage: React.Dispatch<React.SetStateAction<number>>;
  setPerPage: React.Dispatch<React.SetStateAction<number>>;
  setSelectedRuleIds: React.Dispatch<React.SetStateAction<string[]>>;
  setSortingOptions: React.Dispatch<React.SetStateAction<SortingOptions>>;
}

export interface RulesTableContextType {
  state: RulesTableState;
  actions: RulesTableActions;
}

const RulesTableContext = createContext<RulesTableContextType | null>(null);

interface RulesTableContextProviderProps {
  children: React.ReactNode;
  refetchPrePackagedRulesStatus: () => Promise<void>;
}

const IN_MEMORY_STORAGE_KEY = 'detection-rules-table-in-memory';

const DEFAULT_RULES_PER_PAGE = 20;

export const RulesTableContextProvider = ({
  children,
  refetchPrePackagedRulesStatus,
}: RulesTableContextProviderProps) => {
  const [autoRefreshSettings] = useUiSetting$<{
    on: boolean;
    value: number;
    idleTimeout: number;
  }>(DEFAULT_RULES_TABLE_REFRESH_SETTING);
  const { storage } = useKibana().services;

  const [isInMemorySorting, setIsInMemorySorting] = useState<boolean>(
    storage.get(IN_MEMORY_STORAGE_KEY) ?? false
  );
  const [filterOptions, setFilterOptions] = useState<FilterOptions>(initialFilterOptions);
  const [sortingOptions, setSortingOptions] = useState<SortingOptions>(initialSortingOptions);
  const [isAllSelected, setIsAllSelected] = useState(false);
  const [isRefreshOn, setIsRefreshOn] = useState(autoRefreshSettings.on);
  const [loadingRules, setLoadingRules] = useState<LoadingRules>({ ids: [], action: null });
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(DEFAULT_RULES_PER_PAGE);
  const [selectedRuleIds, setSelectedRuleIds] = useState<string[]>([]);

  const toggleInMemorySorting = useCallback(
    (value: boolean) => {
      setIsInMemorySorting(value); // Update state so the table gets re-rendered
      storage.set(IN_MEMORY_STORAGE_KEY, value); // Persist new value in the local storage

      // Reset sorting options when switching to server-side implementation as currently selected sorting might not be supported
      if (value === false) {
        setSortingOptions(initialSortingOptions);
      }
    },
    [storage]
  );

  const isActionInProgress = useMemo(() => {
    if (loadingRules.ids.length > 0) {
      return !['disable', 'enable', 'edit'].includes(loadingRules.action ?? '');
    }
    return false;
  }, [loadingRules.action, loadingRules.ids.length]);

  const pagination = useMemo(() => ({ page, perPage }), [page, perPage]);

  const handleFilterOptionsChange = useCallback((newFilter: Partial<FilterOptions>) => {
    setFilterOptions((currentFilter) => ({ ...currentFilter, ...newFilter }));
    setPage(1);
    setSelectedRuleIds([]);
    setIsAllSelected(false);
  }, []);

  // Fetch rules
  const {
    data: { rules, total } = { rules: [], total: 0 },
    refetch,
    dataUpdatedAt,
    isFetched,
    isFetching,
    isLoading,
    isRefetching,
  } = useFindRules({
    isInMemorySorting,
    filterOptions,
    sortingOptions,
    pagination,
    refetchInterval: isRefreshOn && !isActionInProgress && autoRefreshSettings.value,
  });

  useEffect(() => {
    // Synchronize re-fetching of rules and pre-packaged rule statuses
    if (isFetched && isRefetching) {
      refetchPrePackagedRulesStatus();
    }
  }, [isFetched, isRefetching, refetchPrePackagedRulesStatus]);

  // Paginate and sort rules
  const rulesToDisplay = isInMemorySorting
    ? rules.sort(getRulesComparator(sortingOptions)).slice((page - 1) * perPage, page * perPage)
    : rules;

  const providerValue = useMemo(
    () => ({
      state: {
        rules: rulesToDisplay,
        pagination: {
          page,
          perPage,
          total: isInMemorySorting ? rules.length : total,
        },
        filterOptions,
        isActionInProgress,
        isAllSelected,
        isFetched,
        isFetching,
        isInMemorySorting,
        isLoading,
        isRefetching,
        isRefreshOn,
        lastUpdated: dataUpdatedAt,
        loadingRuleIds: loadingRules.ids,
        loadingRulesAction: loadingRules.action,
        selectedRuleIds,
        sortingOptions,
      },
      actions: {
        reFetchRules: refetch,
        setFilterOptions: handleFilterOptionsChange,
        setIsAllSelected,
        setIsInMemorySorting: toggleInMemorySorting,
        setIsRefreshOn,
        setLoadingRules,
        setPage,
        setPerPage,
        setSelectedRuleIds,
        setSortingOptions,
      },
    }),
    [
      dataUpdatedAt,
      filterOptions,
      handleFilterOptionsChange,
      isActionInProgress,
      isAllSelected,
      isFetched,
      isFetching,
      isInMemorySorting,
      isLoading,
      isRefetching,
      isRefreshOn,
      loadingRules.action,
      loadingRules.ids,
      page,
      perPage,
      refetch,
      rules.length,
      rulesToDisplay,
      selectedRuleIds,
      sortingOptions,
      toggleInMemorySorting,
      total,
    ]
  );

  return <RulesTableContext.Provider value={providerValue}>{children}</RulesTableContext.Provider>;
};

export const useRulesTableContext = (): RulesTableContextType => {
  const rulesTableContext = useContext(RulesTableContext);
  invariant(
    rulesTableContext,
    'useRulesTableContext should be used inside RulesTableContextProvider'
  );

  return rulesTableContext;
};

export const useRulesTableContextOptional = (): RulesTableContextType | null =>
  useContext(RulesTableContext);
