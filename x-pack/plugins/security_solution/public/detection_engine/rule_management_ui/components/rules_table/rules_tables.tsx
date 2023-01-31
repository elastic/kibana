/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiBasicTable,
  EuiConfirmModal,
  EuiEmptyPrompt,
  EuiLoadingContent,
  EuiProgress,
} from '@elastic/eui';
import React, { useCallback, useMemo, useRef } from 'react';
import { Loader } from '../../../../common/components/loader';
import { useBoolState } from '../../../../common/hooks/use_bool_state';
import { useValueChanged } from '../../../../common/hooks/use_value_changed';
import { PrePackagedRulesPrompt } from '../../../../detections/components/rules/pre_packaged_rules/load_empty_prompt';
import type { Rule, RulesSortingFields } from '../../../rule_management/logic';
import * as i18n from '../../../../detections/pages/detection_engine/rules/translations';
import type { EuiBasicTableOnChange } from '../../../../detections/pages/detection_engine/rules/types';
import { BulkActionDryRunConfirmation } from './bulk_actions/bulk_action_dry_run_confirmation';
import { BulkEditFlyout } from './bulk_actions/bulk_edit_flyout';
import { useBulkActions } from './bulk_actions/use_bulk_actions';
import { useBulkActionsConfirmation } from './bulk_actions/use_bulk_actions_confirmation';
import { useBulkActionsDryRun } from './bulk_actions/use_bulk_actions_dry_run';
import { useBulkEditFormFlyout } from './bulk_actions/use_bulk_edit_form_flyout';
import { useRulesTableContext } from './rules_table/rules_table_context';
import { useAsyncConfirmation } from './rules_table/use_async_confirmation';
import { RulesTableFilters } from './rules_table_filters/rules_table_filters';
import { AllRulesTabs } from './rules_table_toolbar';
import { RulesTableUtilityBar } from './rules_table_utility_bar';
import { useMonitoringColumns, useRulesColumns } from './use_columns';
import { useUserData } from '../../../../detections/components/user_info';
import { hasUserCRUDPermission } from '../../../../common/utils/privileges';
import { useBulkDuplicateExceptionsConfirmation } from './bulk_actions/use_bulk_duplicate_confirmation';
import { BulkActionDuplicateExceptionsConfirmation } from './bulk_actions/bulk_duplicate_exceptions_confirmation';
import { useStartMlJobs } from '../../../rule_management/logic/use_start_ml_jobs';
import { RULES_TABLE_PAGE_SIZE_OPTIONS } from './constants';
import { useRuleManagementFilters } from '../../../rule_management/logic/use_rule_management_filters';

const INITIAL_SORT_FIELD = 'enabled';

interface RulesTableProps {
  selectedTab: AllRulesTabs;
}

const NO_ITEMS_MESSAGE = (
  <EuiEmptyPrompt title={<h3>{i18n.NO_RULES}</h3>} titleSize="xs" body={i18n.NO_RULES_BODY} />
);

/**
 * Table Component for displaying all Rules for a given cluster. Provides the ability to filter
 * by name, sort by enabled, and perform the following actions:
 *   * Enable/Disable
 *   * Duplicate
 *   * Delete
 *   * Import/Export
 */
// eslint-disable-next-line complexity
export const RulesTables = React.memo<RulesTableProps>(({ selectedTab }) => {
  const [{ canUserCRUD }] = useUserData();
  const hasPermissions = hasUserCRUDPermission(canUserCRUD);

  const tableRef = useRef<EuiBasicTable>(null);
  const rulesTableContext = useRulesTableContext();
  const { data: ruleManagementFilters } = useRuleManagementFilters();

  const {
    state: {
      rules,
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
    actions: { setIsAllSelected, setPage, setPerPage, setSelectedRuleIds, setSortingOptions },
  } = rulesTableContext;

  const [isDeleteConfirmationVisible, showDeleteConfirmation, hideDeleteConfirmation] =
    useBoolState();

  const [confirmDeletion, handleDeletionConfirm, handleDeletionCancel] = useAsyncConfirmation({
    onInit: showDeleteConfirmation,
    onFinish: hideDeleteConfirmation,
  });

  const {
    bulkActionsDryRunResult,
    bulkAction,
    isBulkActionConfirmationVisible,
    showBulkActionConfirmation,
    cancelBulkActionConfirmation,
    approveBulkActionConfirmation,
  } = useBulkActionsConfirmation();

  const {
    isBulkDuplicateConfirmationVisible,
    showBulkDuplicateConfirmation,
    cancelRuleDuplication,
    confirmRuleDuplication,
  } = useBulkDuplicateExceptionsConfirmation();

  const {
    bulkEditActionType,
    isBulkEditFlyoutVisible,
    handleBulkEditFormConfirm,
    handleBulkEditFormCancel,
    completeBulkEditForm,
  } = useBulkEditFormFlyout();

  const { isBulkActionsDryRunLoading, executeBulkActionsDryRun } = useBulkActionsDryRun();

  const getBulkItemsPopoverContent = useBulkActions({
    filterOptions,
    confirmDeletion,
    showBulkActionConfirmation,
    showBulkDuplicateConfirmation,
    completeBulkEditForm,
    executeBulkActionsDryRun,
  });

  const paginationMemo = useMemo(
    () => ({
      pageIndex: pagination.page - 1,
      pageSize: pagination.perPage,
      totalItemCount: pagination.total,
      pageSizeOptions: RULES_TABLE_PAGE_SIZE_OPTIONS,
    }),
    [pagination]
  );

  const tableOnChangeCallback = useCallback(
    ({ page, sort }: EuiBasicTableOnChange) => {
      setSortingOptions({
        field: (sort?.field as RulesSortingFields) ?? INITIAL_SORT_FIELD, // Narrowing EuiBasicTable sorting types
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
    showExceptionsDuplicateConfirmation: showBulkDuplicateConfirmation,
  });
  const monitoringColumns = useMonitoringColumns({
    hasCRUDPermissions: hasPermissions,
    isLoadingJobs,
    mlJobs,
    startMlJobs,
    showExceptionsDuplicateConfirmation: showBulkDuplicateConfirmation,
  });

  const isSelectAllCalled = useRef(false);

  // TODO Remove this synchronization logic after https://github.com/elastic/eui/issues/6184 is implemented
  // Synchronize selectedRuleIds with EuiBasicTable's selected rows
  useValueChanged((ruleIds) => {
    if (tableRef.current != null) {
      tableRef.current.setSelection(rules.filter((rule) => ruleIds.includes(rule.id)));
    }
  }, selectedRuleIds);

  const euiBasicTableSelectionProps = useMemo(
    () => ({
      selectable: (item: Rule) => !loadingRuleIds.includes(item.id),
      onSelectionChange: (selected: Rule[]) => {
        /**
         * EuiBasicTable doesn't provide declarative API to control selected rows.
         * This limitation requires us to synchronize selection state manually using setSelection().
         * But it creates a chain reaction when the user clicks Select All:
         * selectAll() -> setSelection() -> onSelectionChange() -> setSelection().
         * To break the chain we should check whether the onSelectionChange was triggered
         * by the Select All action or not.
         *
         */
        if (isSelectAllCalled.current) {
          isSelectAllCalled.current = false;
          // Handle special case of unselecting all rules via checkbox
          // after all rules were selected via Bulk select.
          if (selected.length === 0) {
            setIsAllSelected(false);
            setSelectedRuleIds([]);
          }
        } else {
          setSelectedRuleIds(selected.map(({ id }) => id));
          setIsAllSelected(false);
        }
      },
    }),
    [loadingRuleIds, setIsAllSelected, setSelectedRuleIds]
  );

  const toggleSelectAll = useCallback(() => {
    isSelectAllCalled.current = true;
    setIsAllSelected(!isAllSelected);
    setSelectedRuleIds(!isAllSelected ? rules.map(({ id }) => id) : []);
  }, [rules, isAllSelected, setIsAllSelected, setSelectedRuleIds]);

  const isTableEmpty =
    ruleManagementFilters?.rules_summary.custom_count === 0 &&
    ruleManagementFilters?.rules_summary.prebuilt_installed_count === 0;

  const shouldShowRulesTable = !isLoading && !isTableEmpty;

  const tableProps =
    selectedTab === AllRulesTabs.management
      ? {
          'data-test-subj': 'rules-table',
          columns: rulesColumns,
        }
      : { 'data-test-subj': 'monitoring-table', columns: monitoringColumns };

  const shouldShowLinearProgress = isFetched && isRefetching;
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
      {isDeleteConfirmationVisible && (
        <EuiConfirmModal
          title={i18n.DELETE_CONFIRMATION_TITLE}
          onCancel={handleDeletionCancel}
          onConfirm={handleDeletionConfirm}
          confirmButtonText={i18n.DELETE_CONFIRMATION_CONFIRM}
          cancelButtonText={i18n.DELETE_CONFIRMATION_CANCEL}
          buttonColor="danger"
          defaultFocusedButton="confirm"
          data-test-subj="allRulesDeleteConfirmationModal"
        >
          <p>{i18n.DELETE_CONFIRMATION_BODY}</p>
        </EuiConfirmModal>
      )}
      {isBulkActionConfirmationVisible && bulkAction && (
        <BulkActionDryRunConfirmation
          bulkAction={bulkAction}
          result={bulkActionsDryRunResult}
          onCancel={cancelBulkActionConfirmation}
          onConfirm={approveBulkActionConfirmation}
        />
      )}
      {isBulkDuplicateConfirmationVisible && (
        <BulkActionDuplicateExceptionsConfirmation
          onCancel={cancelRuleDuplication}
          onConfirm={confirmRuleDuplication}
          rulesCount={selectedRuleIds?.length ? selectedRuleIds?.length : 1}
        />
      )}
      {isBulkEditFlyoutVisible && bulkEditActionType !== undefined && (
        <BulkEditFlyout
          rulesCount={bulkActionsDryRunResult?.succeededRulesCount ?? 0}
          editAction={bulkEditActionType}
          onClose={handleBulkEditFormCancel}
          onConfirm={handleBulkEditFormConfirm}
        />
      )}
      {shouldShowRulesTable && (
        <>
          <RulesTableFilters />
          <RulesTableUtilityBar
            canBulkEdit={hasPermissions}
            onGetBulkItemsPopoverContent={getBulkItemsPopoverContent}
            onToggleSelectAll={toggleSelectAll}
            isBulkActionInProgress={isBulkActionsDryRunLoading || loadingRulesAction != null}
          />
          <EuiBasicTable
            itemId="id"
            items={rules}
            isSelectable={hasPermissions}
            noItemsMessage={NO_ITEMS_MESSAGE}
            onChange={tableOnChangeCallback}
            pagination={paginationMemo}
            ref={tableRef}
            selection={hasPermissions ? euiBasicTableSelectionProps : undefined}
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

RulesTables.displayName = 'RulesTables';
