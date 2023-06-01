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
import { useUserData } from '../../../../../detections/components/user_info';
import {
  usePerformUpgradeAllRules,
  usePerformUpgradeSpecificRules,
} from '../../../../rule_management/logic/prebuilt_rules/use_perform_rule_upgrade';
import { usePrebuiltRulesUpgradeReview } from '../../../../rule_management/logic/prebuilt_rules/use_prebuilt_rules_upgrade_review';
import type { RuleUpgradeInfoForReview } from '../../../../../../common/detection_engine/prebuilt_rules/api/review_rule_upgrade/response_schema';
import { DEFAULT_RULES_TABLE_REFRESH_SETTING } from '../../../../../../common/constants';
import { invariant } from '../../../../../../common/utils/invariant';
import { useUiSetting$ } from '../../../../../common/lib/kibana';
import type { InMemoryPaginationOptions } from '../../../../rule_management/logic';
import { RULES_TABLE_INITIAL_PAGE_SIZE, RULES_TABLE_PAGE_SIZE_OPTIONS } from '../constants';
import { hasUserCRUDPermission } from '../../../../../common/utils/privileges';
import type { TableColumn } from './use_upgrade_prebuilt_rules_table_columns';
import { useUpgradePrebuiltRulesTableColumns } from './use_upgrade_prebuilt_rules_table_columns';
import { UpgradePrebuiltRulesTableButtons } from './upgrade_prebuilts_rules_table_buttons';

export interface UpgradePrebuiltRulesTableState {
  /**
   * Rules available to be updated
   */
  rules: RuleUpgradeInfoForReview[];
  /**
   * Value of the currently selected table rows for InMemoryTable management
   */
  selectionValue: EuiTableSelectionType<RuleUpgradeInfoForReview>;
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
   * Is true whenever mutation to upgrade all available rules is in-flight
   */
  isUpgradeAllRulesLoading: boolean;
  /**
   * Is true whenever mutation to upgrade specific rules is in-flight
   */
  isUpgradeSpecificRulesLoading: boolean;
  /**
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
  /**
   * Columns for the Upgrade Rules Table
   */
  rulesColumns: TableColumn[];
  /**
   * Rule rows selected in EUI InMemory Table
   */
  selectedRules: RuleUpgradeInfoForReview[];
}

export interface UpgradePrebuiltRulesTableActions {
  reFetchRules: ReturnType<typeof usePrebuiltRulesUpgradeReview>['refetch'];
  onTableChange: (criteria: CriteriaWithPagination<RuleUpgradeInfoForReview>) => void;
  upgradeAllRules: ReturnType<typeof usePerformUpgradeAllRules>['mutateAsync'];
  upgradeSpecificRules: ReturnType<typeof usePerformUpgradeSpecificRules>['mutateAsync'];
}

export interface UpgradePrebuiltRulesContextType {
  state: UpgradePrebuiltRulesTableState;
  actions: UpgradePrebuiltRulesTableActions;
}

const UpgradePrebuiltRulesTableContext = createContext<UpgradePrebuiltRulesContextType | null>(
  null
);

interface UpgradePrebuiltRulesTableContextProviderProps {
  children: React.ReactNode;
}

export const UpgradePrebuiltRulesTableContextProvider = ({
  children,
}: UpgradePrebuiltRulesTableContextProviderProps) => {
  const [autoRefreshSettings] = useUiSetting$<{
    on: boolean;
    value: number;
    idleTimeout: number;
  }>(DEFAULT_RULES_TABLE_REFRESH_SETTING);
  const [pagination, setPagination] = useState<{ pageIndex: number }>({ pageIndex: 0 });
  const [selectedRules, setSelectedRules] = useState<RuleUpgradeInfoForReview[]>([]);

  const onTableChange = ({ page: { index } }: CriteriaWithPagination<RuleUpgradeInfoForReview>) => {
    setPagination({ pageIndex: index });
  };

  const selectionValue: EuiTableSelectionType<RuleUpgradeInfoForReview> = useMemo(
    () => ({
      selectable: () => true,
      onSelectionChange: (newSelectedRules) => setSelectedRules(newSelectedRules),
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
  } = usePrebuiltRulesUpgradeReview({
    refetchInterval: autoRefreshSettings.value,
    keepPreviousData: true, // Use this option so that the state doesn't jump between "success" and "loading" on page change
  });

  const { mutateAsync: upgradeAllRules, isLoading: isUpgradeAllRulesLoading } =
    usePerformUpgradeAllRules();
  const { mutateAsync: upgradeSpecificRules, isLoading: isUpgradeSpecificRulesLoading } =
    usePerformUpgradeSpecificRules();

  const [{ canUserCRUD }] = useUserData();
  const hasPermissions = hasUserCRUDPermission(canUserCRUD);
  const rulesColumns = useUpgradePrebuiltRulesTableColumns({
    upgradeSpecificRules,
    hasCRUDPermissions: hasPermissions,
  });

  const actions = useMemo(
    () => ({
      reFetchRules: refetch,
      onTableChange,
      upgradeAllRules,
      upgradeSpecificRules,
    }),
    [refetch, upgradeAllRules, upgradeSpecificRules]
  );

  const filters: EuiSearchBarProps = useMemo(
    () => ({
      box: {
        incremental: true,
        isClearable: true,
      },
      toolsRight: [<UpgradePrebuiltRulesTableButtons />],
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
        rulesColumns,
        selectedRules,
        isUpgradeAllRulesLoading,
        isUpgradeSpecificRulesLoading,
        lastUpdated: dataUpdatedAt,
      },
      actions,
    };
  }, [
    rules,
    pagination,
    selectionValue,
    filters,
    isFetched,
    isLoading,
    isRefetching,
    isUpgradeAllRulesLoading,
    isUpgradeSpecificRulesLoading,
    rulesColumns,
    selectedRules,
    dataUpdatedAt,
    actions,
  ]);

  return (
    <UpgradePrebuiltRulesTableContext.Provider value={providerValue}>
      {children}
    </UpgradePrebuiltRulesTableContext.Provider>
  );
};

export const useUpgradePrebuiltRulesTableContext = (): UpgradePrebuiltRulesContextType => {
  const rulesTableContext = useContext(UpgradePrebuiltRulesTableContext);
  invariant(
    rulesTableContext,
    'useUpgradePrebuiltRulesTableContext should be used inside UpgradePrebuiltRulesTableContextProvider'
  );

  return rulesTableContext;
};

export const useUpgradePrebuiltRulesTableContextOptional =
  (): UpgradePrebuiltRulesContextType | null => useContext(UpgradePrebuiltRulesTableContext);
