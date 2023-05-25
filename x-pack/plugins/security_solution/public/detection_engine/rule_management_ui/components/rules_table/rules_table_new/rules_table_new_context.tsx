/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEqual } from 'lodash';
import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import {
  CriteriaWithPagination,
  EuiButton,
  EuiInMemoryTable,
  EuiSearchBarProps,
  EuiTableSelectionType,
} from '@elastic/eui';
import { usePrebuiltRulesInstallReview } from '../../../../rule_management/logic/prebuilt_rules/use_prebuilt_rules_install_review';
import { DEFAULT_RULES_TABLE_REFRESH_SETTING } from '../../../../../../common/constants';
import { invariant } from '../../../../../../common/utils/invariant';
import { URL_PARAM_KEY } from '../../../../../common/hooks/use_url_state';
import { useKibana, useUiSetting$ } from '../../../../../common/lib/kibana';
import { useReplaceUrlParams } from '../../../../../common/utils/global_query_string/helpers';
import type {
  FilterOptions,
  InMemoryPaginationOptions,
  SortingOptions,
} from '../../../../rule_management/logic';
import { RULES_TABLE_PAGE_SIZE_OPTIONS, RULES_TABLE_STATE_STORAGE_KEY } from '../constants';
import {
  DEFAULT_FILTER_OPTIONS,
  // DEFAULT_PAGE,
  // DEFAULT_RULES_PER_PAGE,
  DEFAULT_SORTING_OPTIONS,
} from '../rules_table/rules_table_defaults';
import type { RuleInstallationInfoForReview } from '../../../../../../common/detection_engine/prebuilt_rules/api/review_rule_installation/response_schema';

export interface RulesTableNewState {
  /**
   * Rules to display
   */
  rules: RuleInstallationInfoForReview[];
  /**
   * Currently selected table filter
   */
  filterOptions: FilterOptions;
  /**
   * Value of the currently selected table rows
   */
  selectionValue: EuiTableSelectionType<RuleInstallationInfoForReview>;
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
  pagination: InMemoryPaginationOptions;
  /**
   * Currently selected table sorting
   */
  sortingOptions: SortingOptions;
  /**
   * Whether the state has its default value
   */
  // isDefault: boolean;
}

export type LoadingRuleAction = 'accept' | 'dismiss' | null;

export interface LoadingRules {
  ids: string[];
  action: LoadingRuleAction;
}

export interface RulesTableNewActions {
  reFetchRules: ReturnType<typeof usePrebuiltRulesInstallReview>['refetch'];
  setFilterOptions: (newFilter: Partial<FilterOptions>) => void;
  setIsAllSelected: React.Dispatch<React.SetStateAction<boolean>>;
  setIsPreflightInProgress: React.Dispatch<React.SetStateAction<boolean>>;
  /**
   * enable/disable rules table auto refresh
   */
  setIsRefreshOn: React.Dispatch<React.SetStateAction<boolean>>;
  setLoadingRules: React.Dispatch<React.SetStateAction<LoadingRules>>;
  // TODO: Handled by in-memory table? Should these be deleted?
  // setPage: React.Dispatch<React.SetStateAction<number>>;
  // setPerPage: React.Dispatch<React.SetStateAction<number>>;
  setSelectedRules: React.Dispatch<React.SetStateAction<RuleInstallationInfoForReview[]>>;
  setSortingOptions: React.Dispatch<React.SetStateAction<SortingOptions>>;
  /**
   * clears rules selection on a page
   */
  clearRulesSelection: () => void;
  /**
   * Clears rules table filters
   */
  clearFilters: () => void;
  onTableChange: (criteria: CriteriaWithPagination<RuleInstallationInfoForReview>) => void;
}

export interface RulesTableNewContextType {
  state: RulesTableNewState;
  actions: RulesTableNewActions;
}

const RulesTableNewContext = createContext<RulesTableNewContextType | null>(null);

interface RulesTableNewContextProviderProps {
  children: React.ReactNode;
}

export const RulesTableNewContextProvider = ({ children }: RulesTableNewContextProviderProps) => {
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
  const [pagination, setPagination] = useState<{ pageIndex: number }>({ pageIndex: 0 });

  const [selectedRules, setSelectedRules] = useState<RuleInstallationInfoForReview[]>([]);

  const isSelectAllCalled = useRef(false);

  const isActionInProgress = loadingRules.ids.length > 0;

  const onTableChange = ({
    page: { index },
  }: CriteriaWithPagination<RuleInstallationInfoForReview>) => {
    setPagination({ pageIndex: index });
  };

  const handleFilterOptionsChange = useCallback((newFilter: Partial<FilterOptions>) => {
    setFilterOptions((currentFilter) => ({ ...currentFilter, ...newFilter }));
    // setPage(1);
    setSelectedRules([]);
    setIsAllSelected(false);
  }, []);

  const clearRulesSelection = useCallback(() => {
    setSelectedRules([]);
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
    // setPage(DEFAULT_PAGE);
    // setPerPage(DEFAULT_RULES_PER_PAGE);

    replaceUrlParams({ [URL_PARAM_KEY.rulesTable]: null });
    sessionStorage.remove(RULES_TABLE_STATE_STORAGE_KEY);
  }, [setFilterOptions, setSortingOptions, replaceUrlParams, sessionStorage]);

  const selectionValue: EuiTableSelectionType<RuleInstallationInfoForReview> = useMemo(
    () => ({
      selectable: () => true,
      onSelectionChange: (selected: RuleInstallationInfoForReview[]) => {
        /**
         * EuiInMemoryTable doesn't provide declarative API to control selected rows.
         * This limitation requires us to synchronize selection state manually using setSelection().
         * But it creates a chain reaction when the user clicks Select All:
         * selectAll() -> setSelection() -> onSelectionChange() -> setSelection().
         * To break the chain we should check whether the onSelectionChange was triggered
         * by the Select All action or not.
         */
        if (isSelectAllCalled.current) {
          isSelectAllCalled.current = false;
          // Handle special case of unselecting all rules via checkbox
          // after all rules were selected via Bulk select.
          if (selected.length === 0) {
            setIsAllSelected(false);
            setSelectedRules([]);
          }
        } else {
          setSelectedRules(selected);
          setIsAllSelected(false);
        }
      },
      initialSelected: [],
    }),
    []
  );

  const {
    data: {
      attributes: {
        rules,
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
  } = usePrebuiltRulesInstallReview({
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
      // setPage,
      // setPerPage,
      onTableChange,
      setSelectedRules,
      setSortingOptions,
      clearRulesSelection,
      setIsPreflightInProgress,
      clearFilters,
    }),
    [
      refetch,
      handleFilterOptionsChange,
      setIsAllSelected,
      setIsRefreshOn,
      setLoadingRules,
      setSelectedRules,
      setSortingOptions,
      clearRulesSelection,
      setIsPreflightInProgress,
      clearFilters,
    ]
  );

  const filters: EuiSearchBarProps = useMemo(
    () => ({
      box: {
        incremental: true,
        isClearable: true,
      },
      filters: [
        {
          type: 'field_value_selection',
          field: 'tags',
          name: 'Tags',
          multiSelect: true,
          options: [...new Set(rules.flatMap((rule) => rule.tags))].map((tag) => ({
            value: tag,
            name: tag,
            field: 'tags',
          })),
        },
      ],
    }),
    [rules]
  );

  const providerValue = useMemo(() => {
    return {
      state: {
        rules,
        pagination: {
          ...pagination,
          pageSize: 20,
          pageSizeOptions: RULES_TABLE_PAGE_SIZE_OPTIONS,
        },
        selectionValue,
        filters,
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
        selectedRules,
        sortingOptions,
        // isDefault: isDefaultState(filterOptions, sortingOptions, {
        //   pagination,
        //   perPage,
        //   total: rules.length,
        // }),
        tags,
      },
      actions,
    };
  }, [
    rules,
    pagination,
    filters,
    selectionValue,
    tags,
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
    selectedRules,
    sortingOptions,
    actions,
  ]);

  return (
    <RulesTableNewContext.Provider value={providerValue}>{children}</RulesTableNewContext.Provider>
  );
};

export const useRulesTableNewContext = (): RulesTableNewContextType => {
  const rulesTableContext = useContext(RulesTableNewContext);
  invariant(
    rulesTableContext,
    'useRulesTableNewContext should be used inside RulesTableNewContextProvider'
  );

  return rulesTableContext;
};

export const useRulesTableNewContextOptional = (): RulesTableNewContextType | null =>
  useContext(RulesTableNewContext);

// function isDefaultState(
//   filter: FilterOptions,
//   sorting: SortingOptions,
//   pagination: Pagination
// ): boolean {
//   return (
//     isEqual(filter, DEFAULT_FILTER_OPTIONS) &&
//     isEqual(sorting, DEFAULT_SORTING_OPTIONS) &&
//     pagination.page === DEFAULT_PAGE &&
//     pagination.perPage === DEFAULT_RULES_PER_PAGE
//   );
// }
