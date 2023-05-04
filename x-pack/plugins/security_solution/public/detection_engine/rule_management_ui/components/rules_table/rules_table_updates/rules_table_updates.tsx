/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiBasicTable, EuiEmptyPrompt, EuiLoadingContent, EuiProgress } from '@elastic/eui';
import React, { useCallback, useMemo, useRef } from 'react';
import { Loader } from '../../../../../common/components/loader';
import { PrePackagedRulesPrompt } from '../../../../../detections/components/rules/pre_packaged_rules/load_empty_prompt';
import type { Rule } from '../../../../rule_management/logic';
import * as i18n from '../../../../../detections/pages/detection_engine/rules/translations';
import type { EuiBasicTableOnChange } from '../../../../../detections/pages/detection_engine/rules/types';
import { useRulesTableContext } from '../rules_table/rules_table_context';
import { RulesTableFilters } from '../rules_table_filters/rules_table_filters';
import { RulesTableUtilityBar } from '../../rules_table_utility_bar/rules_table_utility_bar';
import { useRulesColumns } from '../use_columns';
import { useUserData } from '../../../../../detections/components/user_info';
import { hasUserCRUDPermission } from '../../../../../common/utils/privileges';
import { useStartMlJobs } from '../../../../rule_management/logic/use_start_ml_jobs';
import { RULES_TABLE_PAGE_SIZE_OPTIONS } from '../constants';
import { useRuleManagementFilters } from '../../../../rule_management/logic/use_rule_management_filters';
import type { FindRulesSortField } from '../../../../../../common/detection_engine/rule_management';
import { useIsUpgradingSecurityPackages } from '../../../../rule_management/logic/use_upgrade_security_packages';

const INITIAL_SORT_FIELD = 'enabled';

interface RulesTableUpdatesProps {}

const NO_ITEMS_MESSAGE = (
  <EuiEmptyPrompt title={<h3>{i18n.NO_RULES}</h3>} titleSize="xs" body={i18n.NO_RULES_BODY} />
);

/**
 * Table Component for displaying rules that have available updates
 */
export const RulesTableUpdates = React.memo<RulesTableUpdatesProps>(({}) => {
  const [{ canUserCRUD }] = useUserData();
  const hasPermissions = hasUserCRUDPermission(canUserCRUD);
  const isUpgradingSecurityPackages = useIsUpgradingSecurityPackages();

  const rulesTableContext = useRulesTableContext();
  const { data: ruleManagementFilters } = useRuleManagementFilters();

  const {
    state: {
      rules,
      rulesToUpgrade,
      filterOptions,
      isPreflightInProgress,
      isAllSelected,
      isFetched,
      isLoading,
      isRefetching,
      loadingRuleIds,
      loadingRulesAction,
      pagination,
      selectedRuleIds,
      sortingOptions,
    },
    actions: {
      setFilterOptions,
      setIsAllSelected,
      setPage,
      setPerPage,
      setSelectedRuleIds,
      setSortingOptions,
    },
  } = rulesTableContext;

  const paginationMemo = useMemo(() => {
    return {
      pageIndex: 0,
      pageSize: 20,
      totalItemCount: rulesToUpgrade.length,
      pageSizeOptions: RULES_TABLE_PAGE_SIZE_OPTIONS,
    };
  }, [pagination]);

  const tableOnChangeCallback = useCallback(
    ({ page, sort }: EuiBasicTableOnChange) => {
      setSortingOptions({
        field: (sort?.field as FindRulesSortField) ?? INITIAL_SORT_FIELD, // Narrowing EuiBasicTable sorting types
        order: sort?.direction ?? 'desc',
      });
      setPage(page.index + 1);
      setPerPage(page.size);
    },
    [setPage, setPerPage, setSortingOptions]
  );

  const { loading: isLoadingJobs, jobs: mlJobs, startMlJobs } = useStartMlJobs();
  const rulesColumns = useRulesColumns({
    hasCRUDPermissions: hasPermissions,
    isLoadingJobs,
    mlJobs,
    startMlJobs,
    showExceptionsDuplicateConfirmation: () => new Promise(() => {}),
  });

  const isSelectAllCalled = useRef(false);

  const toggleSelectAll = useCallback(() => {
    isSelectAllCalled.current = true;
    setIsAllSelected(!isAllSelected);
    setSelectedRuleIds(!isAllSelected ? rules.map(({ id }) => id) : []);
  }, [rules, isAllSelected, setIsAllSelected, setSelectedRuleIds]);

  const isTableEmpty =
    ruleManagementFilters?.rules_summary.custom_count === 0 &&
    ruleManagementFilters?.rules_summary.prebuilt_installed_count === 0;

  const shouldShowRulesTable = !isLoading && !isTableEmpty;

  let tableProps;
  let currentRules;

  currentRules = rulesToUpgrade.map((r) => r.rule);
  tableProps = {
    'data-test-subj': 'rules-updates-table',
    columns: rulesColumns,
  };

  const shouldShowLinearProgress = (isFetched && isRefetching) || isUpgradingSecurityPackages;
  const shouldShowLoadingOverlay = (!isFetched && isRefetching) || isPreflightInProgress;

  return (
    <>
      {shouldShowLinearProgress && (
        <EuiProgress
          data-test-subj="loadingRulesInfoProgress"
          size="xs"
          position="absolute"
          color="accent"
        />
      )}
      {shouldShowLoadingOverlay && (
        <Loader data-test-subj="loadingPanelAllRulesTable" overlay size="xl" />
      )}
      {isTableEmpty && <PrePackagedRulesPrompt />}
      {isLoading && (
        <EuiLoadingContent data-test-subj="initialLoadingPanelAllRulesTable" lines={10} />
      )}
      {shouldShowRulesTable && (
        <>
          <RulesTableFilters filterOptions={filterOptions} setFilterOptions={setFilterOptions} />
          <RulesTableUtilityBar
            canBulkEdit={hasPermissions}
            onGetBulkItemsPopoverContent={undefined}
            onToggleSelectAll={toggleSelectAll}
            isBulkActionInProgress={false}
          />
          <EuiBasicTable
            itemId="id"
            items={currentRules}
            isSelectable={false}
            noItemsMessage={NO_ITEMS_MESSAGE}
            onChange={tableOnChangeCallback}
            pagination={paginationMemo}
            selection={undefined}
            sorting={{
              sort: {
                // EuiBasicTable has incorrect `sort.field` types which accept only `keyof Item` and reject fields in dot notation
                field: sortingOptions.field as keyof Rule,
                direction: sortingOptions.order,
              },
            }}
            {...tableProps}
          />
        </>
      )}
    </>
  );
});

RulesTableUpdates.displayName = 'RulesTableUpdates';
