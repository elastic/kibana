/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// import { isEqual } from 'lodash';
import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import type {
  CriteriaWithPagination,
  EuiInMemoryTable,
  EuiSearchBarProps,
  EuiTableSelectionType,
} from '@elastic/eui';
import { usePrebuiltRulesInstallReview } from '../../../../rule_management/logic/prebuilt_rules/use_prebuilt_rules_install_review';
import { DEFAULT_RULES_TABLE_REFRESH_SETTING } from '../../../../../../common/constants';
import { invariant } from '../../../../../../common/utils/invariant';
import { useUiSetting$ } from '../../../../../common/lib/kibana';
import type { FilterOptions, InMemoryPaginationOptions } from '../../../../rule_management/logic';
import { RULES_TABLE_INITIAL_PAGE_SIZE, RULES_TABLE_PAGE_SIZE_OPTIONS } from '../constants';
import type { RuleInstallationInfoForReview } from '../../../../../../common/detection_engine/prebuilt_rules/api/review_rule_installation/response_schema';

export interface RulesTableNewState {
  /**
   * Rules to display
   */
  rules: RuleInstallationInfoForReview[];
  /**
   * Value of the currently selected table rows for InMemoryTable management
   */
  selectionValue: EuiTableSelectionType<RuleInstallationInfoForReview>;
  /**
   * Rules selected by checkbox
   */
  selectedRules: RuleInstallationInfoForReview[];
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
   * Whether the state has its default value
   */
  // isDefault: boolean;
  /**
   * EuiSearchBarProps filters for InMemoryTable
   */
  filters: EuiSearchBarProps;
  isSelectAllCalled: React.MutableRefObject<boolean>;
  tableRef: React.MutableRefObject<EuiInMemoryTable<RuleInstallationInfoForReview> | null>;
}

export type LoadingRuleAction = 'accept' | 'dismiss' | null;

export interface LoadingRules {
  ids: string[];
  action: LoadingRuleAction;
}

export interface RulesTableNewActions {
  reFetchRules: ReturnType<typeof usePrebuiltRulesInstallReview>['refetch'];
  setIsAllSelected: React.Dispatch<React.SetStateAction<boolean>>;
  setIsPreflightInProgress: React.Dispatch<React.SetStateAction<boolean>>;
  /**
   * enable/disable rules table auto refresh
   */
  setIsRefreshOn: React.Dispatch<React.SetStateAction<boolean>>;
  setLoadingRules: React.Dispatch<React.SetStateAction<LoadingRules>>;
  setSelectedRules: React.Dispatch<React.SetStateAction<RuleInstallationInfoForReview[]>>;
  /**
   * clears rules selection on a page
   */
  clearRulesSelection: () => void;
  /**
   * Clears rules table filters
   */
  // clearFilters: () => void;
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
  const tableRef = useRef<EuiInMemoryTable<RuleInstallationInfoForReview> | null>(null);
  const [autoRefreshSettings] = useUiSetting$<{
    on: boolean;
    value: number;
    idleTimeout: number;
  }>(DEFAULT_RULES_TABLE_REFRESH_SETTING);
  const [selectedRules, setSelectedRules] = useState<RuleInstallationInfoForReview[]>([]);
  const [isAllSelected, setIsAllSelected] = useState(false);
  const [isRefreshOn, setIsRefreshOn] = useState(autoRefreshSettings.on);
  const [loadingRules, setLoadingRules] = useState<LoadingRules>({
    ids: [],
    action: null,
  });
  const [isPreflightInProgress, setIsPreflightInProgress] = useState(false);
  const [pagination, setPagination] = useState<{ pageIndex: number }>({ pageIndex: 0 });

  const isSelectAllCalled = useRef(false);

  const isActionInProgress = loadingRules.ids.length > 0;

  const onTableChange = ({
    page: { index },
  }: CriteriaWithPagination<RuleInstallationInfoForReview>) => {
    setPagination({ pageIndex: index });
  };

  const handleFilterOptionsChange = useCallback((newFilter: Partial<FilterOptions>) => {
    // setFilterOptions((currentFilter) => ({ ...currentFilter, ...newFilter }));
    setSelectedRules([]);
    setIsAllSelected(false);
  }, []);

  const clearRulesSelection = useCallback(() => {
    setSelectedRules([]);
    setIsAllSelected(false);
  }, []);

  // const replaceUrlParams = useReplaceUrlParams();
  // const clearFilters = useCallback(() => {
  //   setFilterOptions({
  //     filter: DEFAULT_FILTER_OPTIONS.filter,
  //     showElasticRules: DEFAULT_FILTER_OPTIONS.showElasticRules,
  //     showCustomRules: DEFAULT_FILTER_OPTIONS.showCustomRules,
  //     tags: DEFAULT_FILTER_OPTIONS.tags,
  //     enabled: undefined,
  //   });
  //   setSortingOptions({
  //     field: DEFAULT_SORTING_OPTIONS.field,
  //     order: DEFAULT_SORTING_OPTIONS.order,
  //   });
  //   // setPage(DEFAULT_PAGE);
  //   // setPerPage(DEFAULT_RULES_PER_PAGE);

  //   replaceUrlParams({ [URL_PARAM_KEY.rulesTable]: null });
  //   sessionStorage.remove(RULES_TABLE_STATE_STORAGE_KEY);
  // }, [setFilterOptions, setSortingOptions, replaceUrlParams, sessionStorage]);

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
      setSelectedRules,
      onTableChange,
      clearRulesSelection,
      setIsPreflightInProgress,
    }),
    [
      refetch,
      handleFilterOptionsChange,
      setIsAllSelected,
      setIsRefreshOn,
      setLoadingRules,
      setSelectedRules,
      clearRulesSelection,
      setIsPreflightInProgress,
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
          options: tags.map((tag) => ({
            value: tag,
            name: tag,
            field: 'tags',
          })),
        },
      ],
    }),
    [tags]
  );

  const providerValue = useMemo(() => {
    return {
      state: {
        tableRef,
        rules,
        pagination: {
          ...pagination,
          pageSize: tableRef.current?.state?.pageSize ?? RULES_TABLE_INITIAL_PAGE_SIZE,
          numberOfFilteredRules: tableRef.current?.tableRef.current?.props.items.length ?? 0,
          initialPageSize: RULES_TABLE_INITIAL_PAGE_SIZE,
          pageSizeOptions: RULES_TABLE_PAGE_SIZE_OPTIONS,
        },
        selectionValue,
        selectedRules,
        isSelectAllCalled,
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
    actions,
  ]);
  console.log({ tableRef });
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
