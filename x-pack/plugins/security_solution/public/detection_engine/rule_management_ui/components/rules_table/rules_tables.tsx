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
import { RULES_TABLE_PAGE_SIZE_OPTIONS } from '../../../../../common/constants';
import { Loader } from '../../../../common/components/loader';
import { useBoolState } from '../../../../common/hooks/use_bool_state';
import { useValueChanged } from '../../../../common/hooks/use_value_changed';
import { RULES_TABLE_ACTIONS } from '../../../../common/lib/apm/user_actions';
import { useStartTransaction } from '../../../../common/lib/apm/use_start_transaction';
import { PrePackagedRulesPrompt } from '../../../../detections/components/rules/pre_packaged_rules/load_empty_prompt';
import type {
  Rule,
  RulesSortingFields,
} from '../../../rule_management/logic';
import { usePrePackagedRulesInstallationStatus } from '../../../rule_management/logic/use_pre_packaged_rules_installation_status';
import { usePrePackagedRulesStatus } from '../../../rule_management/logic/use_pre_packaged_rules_status';
import * as i18n from '../../../../detections/pages/detection_engine/rules/translations';
import type { EuiBasicTableOnChange } from '../../../../detections/pages/detection_engine/rules/types';
import { BulkActionDryRunConfirmation } from './bulk_actions/bulk_action_dry_run_confirmation';
import { BulkEditFlyout } from './bulk_actions/bulk_edit_flyout';
import { useBulkActions } from './bulk_actions/use_bulk_actions';
import { useBulkActionsConfirmation } from './bulk_actions/use_bulk_actions_confirmation';
import { useBulkActionsDryRun } from './bulk_actions/use_bulk_actions_dry_run';
import { useBulkEditFormFlyout } from './bulk_actions/use_bulk_edit_form_flyout';
import { showRulesTable } from './helpers';
import { useRulesTableContext } from './rules_table/rules_table_context';
import { useAsyncConfirmation } from './rules_table/use_async_confirmation';
import { RulesTableFilters } from './rules_table_filters/rules_table_filters';
import { AllRulesTabs } from './rules_table_toolbar';
import { RulesTableUtilityBar } from './rules_table_utility_bar';
import { useMonitoringColumns, useRulesColumns } from './use_columns';

const INITIAL_SORT_FIELD = 'enabled';

interface RulesTableProps {
  createPrePackagedRules: () => void;
  hasPermissions: boolean;
  loadingCreatePrePackagedRules: boolean;
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
export const RulesTables = React.memo<RulesTableProps>(
  ({ createPrePackagedRules, hasPermissions, loadingCreatePrePackagedRules, selectedTab }) => {
    const { startTransaction } = useStartTransaction();
    const tableRef = useRef<EuiBasicTable>(null);
    const rulesTableContext = useRulesTableContext();
    const { data: prePackagedRulesStatus } = usePrePackagedRulesStatus();
    const rulesCustomInstalled = prePackagedRulesStatus?.rulesCustomInstalled;
    const rulesInstalled = prePackagedRulesStatus?.rulesInstalled;

    const {
      state: {
        rules,
        filterOptions,
        isActionInProgress,
        isAllSelected,
        isFetched,
        isLoading,
        isRefetching,
        isRefreshOn,
        loadingRuleIds,
        loadingRulesAction,
        pagination,
        selectedRuleIds,
        sortingOptions,
      },
      actions: {
        reFetchRules,
        setIsAllSelected,
        setIsRefreshOn,
        setPage,
        setPerPage,
        setSelectedRuleIds,
        setSortingOptions,
      },
    } = rulesTableContext;

    // TODO move inside a child component that shows the prepackaged rules update callout
    const prePackagedRuleStatus = usePrePackagedRulesInstallationStatus();

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
      bulkEditActionType,
      isBulkEditFlyoutVisible,
      handleBulkEditFormConfirm,
      handleBulkEditFormCancel,
      completeBulkEditForm,
    } = useBulkEditFormFlyout();

    const selectedItemsCount = isAllSelected ? pagination.total : selectedRuleIds.length;

    // TODO What's the reason for it to be on the top level? Should it live inside useBulkActions?
    const { isBulkActionsDryRunLoading, executeBulkActionsDryRun } = useBulkActionsDryRun();

    const getBulkItemsPopoverContent = useBulkActions({
      filterOptions,
      confirmDeletion,
      showBulkActionConfirmation,
      completeBulkEditForm,
      executeBulkActionsDryRun,
    });

    // TODO move to the rules table context
    const paginationMemo = useMemo(
      () => ({
        pageIndex: pagination.page - 1,
        pageSize: pagination.perPage,
        totalItemCount: pagination.total,
        pageSizeOptions: RULES_TABLE_PAGE_SIZE_OPTIONS,
      }),
      [pagination]
    );

    // TODO pagination logic should be handled on the RulesTableContext level
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

    const rulesColumns = useRulesColumns({ hasPermissions });
    const monitoringColumns = useMonitoringColumns({ hasPermissions });

    const handleCreatePrePackagedRules = useCallback(async () => {
      if (createPrePackagedRules != null) {
        startTransaction({ name: RULES_TABLE_ACTIONS.LOAD_PREBUILT });
        await createPrePackagedRules();
        await reFetchRules();
      }
    }, [createPrePackagedRules, reFetchRules, startTransaction]);

    // TODO move to RulesTableUtilityBar
    const handleRefreshRules = useCallback(() => {
      startTransaction({ name: RULES_TABLE_ACTIONS.REFRESH });
      reFetchRules();
    }, [reFetchRules, startTransaction]);

    const isSelectAllCalled = useRef(false);

    // TODO fix this on the EUI table side and remove this logic altogether (or use a decorator)
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

    // TODO move to the rules table context level
    const toggleSelectAll = useCallback(() => {
      isSelectAllCalled.current = true;
      setIsAllSelected(!isAllSelected);
      setSelectedRuleIds(!isAllSelected ? rules.map(({ id }) => id) : []);
    }, [rules, isAllSelected, setIsAllSelected, setSelectedRuleIds]);

    // TODO move to RulesTableUtilityBar
    const handleAutoRefreshSwitch = useCallback(
      (refreshOn: boolean) => {
        if (refreshOn) {
          reFetchRules();
        }
        setIsRefreshOn(refreshOn);
      },
      [setIsRefreshOn, reFetchRules]
    );

    // TODO can we get rid of this? Use EUIs isLoading
    const shouldShowRulesTable = useMemo(
      (): boolean => showRulesTable({ rulesCustomInstalled, rulesInstalled }) && !isLoading,
      [isLoading, rulesCustomInstalled, rulesInstalled]
    );

    // TODO move inside a child component that shows the prepackaged rules update callout
    const isTableEmpty = useMemo(
      (): boolean =>
        rulesCustomInstalled != null &&
        rulesCustomInstalled === 0 &&
        prePackagedRuleStatus === 'ruleNotInstalled' &&
        !isLoading,
      [isLoading, prePackagedRuleStatus, rulesCustomInstalled]
    );

    const tableProps =
      selectedTab === AllRulesTabs.rules
        ? {
            'data-test-subj': 'rules-table',
            columns: rulesColumns,
          }
        : { 'data-test-subj': 'monitoring-table', columns: monitoringColumns };

    const shouldShowLinearProgress = isFetched && isRefetching;
    const shouldShowLoadingOverlay = (!isFetched && isRefetching) || isActionInProgress;

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
        {shouldShowRulesTable && <RulesTableFilters />}
        {isTableEmpty && (
          // TODO create a component and encapsulate the prepackaged rules installation logic/hooks there
          <PrePackagedRulesPrompt
            createPrePackagedRules={handleCreatePrePackagedRules}
            loading={loadingCreatePrePackagedRules}
            userHasPermissions={hasPermissions}
          />
        )}
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
            <RulesTableUtilityBar
              canBulkEdit={hasPermissions}
              pagination={pagination}
              numberSelectedItems={selectedItemsCount}
              onGetBulkItemsPopoverContent={getBulkItemsPopoverContent}
              onRefresh={handleRefreshRules}
              isAutoRefreshOn={isRefreshOn}
              onRefreshSwitch={handleAutoRefreshSwitch}
              isAllSelected={isAllSelected}
              onToggleSelectAll={toggleSelectAll}
              isBulkActionInProgress={isBulkActionsDryRunLoading || loadingRulesAction != null}
              hasDisabledActions={loadingRulesAction != null}
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
  }
);

RulesTables.displayName = 'RulesTables';
