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

export interface AddPrebuiltRulesTableState {
  /**
   * Rules avialable to be installed
   */
  rules: RuleInstallationInfoForReview[];
  /**
   * Value of the currently selected table rows for InMemoryTable management
   */
  selectionValue: EuiTableSelectionType<RuleInstallationInfoForReview>;
  /**
   * Is true then there is no cached data and the query is currently fetching.
   */
  isLoading: boolean;
  /**
   * Will be true if the query has been fetched.
   */
  isFetched: boolean;
  /**
   * Is true whenever a background refetch is in-flight, which does not include initial loading
   */
  isRefetching: boolean;
  /**
   * The timestamp for when the rules were successfully fetched
   */
  lastUpdated: number;
  /**
   * Currently selected page and number of rows per page
   */
  pagination: InMemoryPaginationOptions;
  /**
   * EuiSearchBarProps filters for InMemoryTable
   */
  filters: EuiSearchBarProps;
}

export interface AddPrebuiltRulesTableActions {
  reFetchRules: ReturnType<typeof usePrebuiltRulesInstallReview>['refetch'];
  onTableChange: (criteria: CriteriaWithPagination<RuleInstallationInfoForReview>) => void;
}

export interface AddPrebuiltRulesContextType {
  state: AddPrebuiltRulesTableState;
  actions: AddPrebuiltRulesTableActions;
}

const AddPrebuiltRulesTableContext = createContext<AddPrebuiltRulesContextType | null>(null);

interface AddPrebuiltRulesTableContextProviderProps {
  children: React.ReactNode;
}

export const AddPrebuiltRulesTableContextProvider = ({
  children,
}: AddPrebuiltRulesTableContextProviderProps) => {
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
    <AddPrebuiltRulesTableContext.Provider value={providerValue}>
      {children}
    </AddPrebuiltRulesTableContext.Provider>
  );
};

export const useAddPrebuiltRulesTableContext = (): AddPrebuiltRulesContextType => {
  const rulesTableContext = useContext(AddPrebuiltRulesTableContext);
  invariant(
    rulesTableContext,
    'useAddPrebuiltRulesTableContext should be used inside AddPrebuiltRulesTableContextProvider'
  );

  return rulesTableContext;
};

export const useAddPrebuiltRulesTableContextOptional = (): AddPrebuiltRulesContextType | null =>
  useContext(AddPrebuiltRulesTableContext);
