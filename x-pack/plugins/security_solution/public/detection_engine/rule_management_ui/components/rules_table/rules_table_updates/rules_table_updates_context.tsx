/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEqual } from 'lodash';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { DEFAULT_RULES_TABLE_REFRESH_SETTING } from '../../../../../../common/constants';
import { invariant } from '../../../../../../common/utils/invariant';
import { URL_PARAM_KEY } from '../../../../../common/hooks/use_url_state';
import { useKibana, useUiSetting$ } from '../../../../../common/lib/kibana';
import { useReplaceUrlParams } from '../../../../../common/utils/global_query_string/helpers';
import type {
  FilterOptions,
  PaginationOptions,
  SortingOptions,
} from '../../../../rule_management/logic/types';
import { RULES_TABLE_STATE_STORAGE_KEY } from '../constants';
import {
  DEFAULT_FILTER_OPTIONS,
  DEFAULT_PAGE,
  DEFAULT_RULES_PER_PAGE,
  DEFAULT_SORTING_OPTIONS,
} from '../rules_table/rules_table_defaults';
import type { RuleUpgradeInfoForReview } from '../../../../../../common/detection_engine/prebuilt_rules/api/review_rule_upgrade/response_schema';
import { usePrebuiltRulesUpgradeReview } from '../../../../rule_management/logic/prebuilt_rules/use_prebuilt_rules_upgrade_review';

export interface RulesTableUpdatesState {
  /**
   * Rules to display
   */
  rules: RuleUpgradeInfoForReview[];
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
   * Is true then there is no cached data and the query is currently fetching.
   */
  isLoading: boolean;
  /**
   * Is true when a preflight request (dry-run) is in progress.
   */
  isPreflightInProgress: boolean;
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
   * Indicates which rule action (accept/dismiss) is currently in progress
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
  /**
   * Whether the state has its default value
   */
  isDefault: boolean;
}

export type LoadingRuleAction = 'accept' | 'dismiss' | null;

export interface LoadingRules {
  ids: string[];
  action: LoadingRuleAction;
}

export interface RulesTableUpdatesActions {
  reFetchRules: ReturnType<typeof usePrebuiltRulesUpgradeReview>['refetch'];
  setFilterOptions: (newFilter: Partial<FilterOptions>) => void;
  setIsAllSelected: React.Dispatch<React.SetStateAction<boolean>>;
  setIsPreflightInProgress: React.Dispatch<React.SetStateAction<boolean>>;
  /**
   * enable/disable rules table auto refresh
   */
  setIsRefreshOn: React.Dispatch<React.SetStateAction<boolean>>;
  setLoadingRules: React.Dispatch<React.SetStateAction<LoadingRules>>;
  // TODO: Handled by in-memory table?
  setPage: React.Dispatch<React.SetStateAction<number>>;
  setPerPage: React.Dispatch<React.SetStateAction<number>>;
  setSelectedRuleIds: React.Dispatch<React.SetStateAction<string[]>>;
  setSortingOptions: React.Dispatch<React.SetStateAction<SortingOptions>>;
  /**
   * clears rules selection on a page
   */
  clearRulesSelection: () => void;
  /**
   * Clears rules table filters
   */
  clearFilters: () => void;
}

export interface RulesTableUpdatesContextType {
  state: RulesTableUpdatesState;
  actions: RulesTableUpdatesActions;
}

const RulesTableUpdatesContext = createContext<RulesTableUpdatesContextType | null>(null);

interface RulesTableUpdatesContextProviderProps {
  children: React.ReactNode;
}

export const RulesTableUpdatesContextProvider = ({
  children,
}: RulesTableUpdatesContextProviderProps) => {
  const [autoRefreshSettings] = useUiSetting$<{
    on: boolean;
    value: number;
    idleTimeout: number;
  }>(DEFAULT_RULES_TABLE_REFRESH_SETTING);
  const { sessionStorage } = useKibana().services;

  const [filterOptions, setFilterOptions] = useState<FilterOptions>({
    filter: DEFAULT_FILTER_OPTIONS.filter,
    tags: DEFAULT_FILTER_OPTIONS.tags,
    showCustomRules: DEFAULT_FILTER_OPTIONS.showCustomRules,
    showElasticRules: DEFAULT_FILTER_OPTIONS.showElasticRules,
    enabled: true,
  });
  const [sortingOptions, setSortingOptions] = useState<SortingOptions>({
    field: DEFAULT_SORTING_OPTIONS.field,
    order: DEFAULT_SORTING_OPTIONS.order,
  });

  const [isAllSelected, setIsAllSelected] = useState(false);
  const [isRefreshOn, setIsRefreshOn] = useState(autoRefreshSettings.on);
  const [loadingRules, setLoadingRules] = useState<LoadingRules>({
    ids: [],
    action: null,
  });
  const [isPreflightInProgress, setIsPreflightInProgress] = useState(false);
  const [page, setPage] = useState(DEFAULT_PAGE);
  const [perPage, setPerPage] = useState(DEFAULT_RULES_PER_PAGE);
  const [selectedRuleIds, setSelectedRuleIds] = useState<string[]>([]);
  const autoRefreshBeforePause = useRef<boolean | null>(null);

  const isActionInProgress = loadingRules.ids.length > 0;

  const pagination = useMemo(() => ({ page, perPage }), [page, perPage]);

  const handleFilterOptionsChange = useCallback((newFilter: Partial<FilterOptions>) => {
    setFilterOptions((currentFilter) => ({ ...currentFilter, ...newFilter }));
    setPage(1);
    setSelectedRuleIds([]);
    setIsAllSelected(false);
  }, []);

  const clearRulesSelection = useCallback(() => {
    setSelectedRuleIds([]);
    setIsAllSelected(false);
  }, []);

  const replaceUrlParams = useReplaceUrlParams();
  const clearFilters = useCallback(() => {
    setFilterOptions({
      filter: DEFAULT_FILTER_OPTIONS.filter,
      showElasticRules: DEFAULT_FILTER_OPTIONS.showElasticRules,
      showCustomRules: DEFAULT_FILTER_OPTIONS.showCustomRules,
      tags: DEFAULT_FILTER_OPTIONS.tags,
      enabled: undefined,
    });
    setSortingOptions({
      field: DEFAULT_SORTING_OPTIONS.field,
      order: DEFAULT_SORTING_OPTIONS.order,
    });
    setPage(DEFAULT_PAGE);
    setPerPage(DEFAULT_RULES_PER_PAGE);

    replaceUrlParams({ [URL_PARAM_KEY.rulesTable]: null });
    sessionStorage.remove(RULES_TABLE_STATE_STORAGE_KEY);
  }, [setFilterOptions, setSortingOptions, setPage, setPerPage, replaceUrlParams, sessionStorage]);

  useEffect(() => {
    // pause table auto refresh when any of rule selected
    // store current auto refresh value, to use it later, when all rules selection will be cleared
    if (selectedRuleIds.length > 0) {
      setIsRefreshOn(false);
      if (autoRefreshBeforePause.current == null) {
        autoRefreshBeforePause.current = isRefreshOn;
      }
    } else {
      // if no rules selected, update auto refresh value, with previously stored value
      setIsRefreshOn(autoRefreshBeforePause.current ?? isRefreshOn);
      autoRefreshBeforePause.current = null;
    }
  }, [selectedRuleIds, isRefreshOn]);

  // // Fetch rules
  // const {
  //   data: { rules, total } = { rules: [], total: 0 },
  //   refetch,
  //   dataUpdatedAt,
  //   isFetched,
  //   isFetching,
  //   isLoading,
  //   isRefetching,
  // } = useFindRules(
  //   {
  //     filterOptions,
  //     sortingOptions,
  //     pagination,
  //   },
  //   {
  //     refetchInterval: isRefreshOn && !isActionInProgress && autoRefreshSettings.value,
  //     keepPreviousData: true, // Use this option so that the state doesn't jump between "success" and "loading" on page change
  //   }
  // );

  const {
    data: {
      attributes: {
        rules: rulesToUpgrade = [],
        stats: { tags },
      },
    } = {
      attributes: {
        rules: [],
        stats: { tags: [] },
      },
    },
    refetch,
    dataUpdatedAt,
    isFetched,
    isFetching,
    isLoading,
    isRefetching,
  } = usePrebuiltRulesUpgradeReview({
    refetchInterval: isRefreshOn && !isActionInProgress && autoRefreshSettings.value,
    keepPreviousData: true, // Use this option so that the state doesn't jump between "success" and "loading" on page change
  });

  const actions = useMemo(
    () => ({
      reFetchRules: refetch,
      setFilterOptions: handleFilterOptionsChange,
      setIsAllSelected,
      setIsRefreshOn,
      setLoadingRules,
      setPage,
      setPerPage,
      setSelectedRuleIds,
      setSortingOptions,
      clearRulesSelection,
      setIsPreflightInProgress,
      clearFilters,
    }),
    [refetch, handleFilterOptionsChange, clearRulesSelection, clearFilters]
  );

  const providerValue = useMemo(() => {
    return {
      state: {
        rules: rulesToUpgrade,
        pagination: {
          page,
          perPage,
          total: rulesToUpgrade.length,
        },
        filterOptions,
        isPreflightInProgress,
        isActionInProgress,
        isAllSelected,
        isFetched,
        isFetching,
        isLoading,
        isRefetching,
        isRefreshOn,
        lastUpdated: dataUpdatedAt,
        loadingRuleIds: loadingRules.ids,
        loadingRulesAction: loadingRules.action,
        selectedRuleIds,
        sortingOptions,
        isDefault: isDefaultState(filterOptions, sortingOptions, {
          page,
          perPage,
          total: rulesToUpgrade.length,
        }),
      },
      actions,
    };
  }, [
    rulesToUpgrade,
    page,
    perPage,
    filterOptions,
    isPreflightInProgress,
    isActionInProgress,
    isAllSelected,
    isFetched,
    isFetching,
    isLoading,
    isRefetching,
    isRefreshOn,
    dataUpdatedAt,
    loadingRules.ids,
    loadingRules.action,
    selectedRuleIds,
    sortingOptions,
    actions,
  ]);

  return (
    <RulesTableUpdatesContext.Provider value={providerValue}>
      {children}
    </RulesTableUpdatesContext.Provider>
  );
};

export const useRulesTableUpdatesContext = (): RulesTableUpdatesContextType => {
  const rulesTableContext = useContext(RulesTableUpdatesContext);
  invariant(
    rulesTableContext,
    'useRulesTableUpdatesContext should be used inside RulesTableUpdatesContextProvider'
  );

  return rulesTableContext;
};

export const useRulesTableUpdatesContextOptional = (): RulesTableUpdatesContextType | null =>
  useContext(RulesTableUpdatesContext);

function isDefaultState(
  filter: FilterOptions,
  sorting: SortingOptions,
  pagination: PaginationOptions
): boolean {
  return (
    isEqual(filter, DEFAULT_FILTER_OPTIONS) &&
    isEqual(sorting, DEFAULT_SORTING_OPTIONS) &&
    pagination.page === DEFAULT_PAGE &&
    pagination.perPage === DEFAULT_RULES_PER_PAGE
  );
}
