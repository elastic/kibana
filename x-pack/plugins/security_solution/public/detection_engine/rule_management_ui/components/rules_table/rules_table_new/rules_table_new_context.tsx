/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// import { isEqual } from 'lodash';
import React, { createContext, useContext, useMemo, useState } from 'react';
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
import type { InMemoryPaginationOptions } from '../../../../rule_management/logic';
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
  tableRef: React.MutableRefObject<EuiInMemoryTable<RuleInstallationInfoForReview> | null>;
}

export type LoadingRuleAction = 'accept' | 'dismiss' | null;

export interface LoadingRules {
  ids: string[];
  action: LoadingRuleAction;
}

export interface RulesTableNewActions {
  reFetchRules: ReturnType<typeof usePrebuiltRulesInstallReview>['refetch'];
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
  const [pagination, setPagination] = useState<{ pageIndex: number }>({ pageIndex: 0 });

  const onTableChange = ({
    page: { index },
  }: CriteriaWithPagination<RuleInstallationInfoForReview>) => {
    setPagination({ pageIndex: index });
  };

  const selectionValue: EuiTableSelectionType<RuleInstallationInfoForReview> = useMemo(
    () => ({
      selectable: () => true,
      initialSelected: [],
    }),
    []
  );

  const {
    data: { rules, stats: { tags } } = {
      rules: [],
      stats: { tags: [] },
    },
    refetch,
    dataUpdatedAt,
    isFetched,
    isLoading,
    isRefetching,
  } = usePrebuiltRulesInstallReview({
    refetchInterval: autoRefreshSettings.value,
    keepPreviousData: true, // Use this option so that the state doesn't jump between "success" and "loading" on page change
  });

  const actions = useMemo(
    () => ({
      reFetchRules: refetch,
      onTableChange,
    }),
    [refetch]
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
        rules,
        pagination: {
          ...pagination,
          initialPageSize: RULES_TABLE_INITIAL_PAGE_SIZE,
          pageSizeOptions: RULES_TABLE_PAGE_SIZE_OPTIONS,
        },
        selectionValue,
        filters,
        isFetched,
        isLoading,
        isRefetching,
        lastUpdated: dataUpdatedAt,
      },
      actions,
    };
  }, [
    rules,
    pagination,
    filters,
    selectionValue,
    isFetched,
    isLoading,
    isRefetching,
    dataUpdatedAt,
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
