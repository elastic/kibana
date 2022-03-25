/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable complexity */

import {
  EuiBasicTable,
  EuiConfirmModal,
  EuiEmptyPrompt,
  EuiLoadingContent,
  EuiProgress,
} from '@elastic/eui';
import React, { useCallback, useMemo, useRef } from 'react';
import { partition } from 'lodash/fp';

import { AllRulesTabs } from './rules_table_toolbar';
import { HeaderSection } from '../../../../../common/components/header_section';
import { Loader } from '../../../../../common/components/loader';
import { useBoolState } from '../../../../../common/hooks/use_bool_state';
import { useValueChanged } from '../../../../../common/hooks/use_value_changed';
import { useKibana } from '../../../../../common/lib/kibana';
import { PrePackagedRulesPrompt } from '../../../../components/rules/pre_packaged_rules/load_empty_prompt';
import {
  CreatePreBuiltRules,
  FilterOptions,
  Rule,
  RulesSortingFields,
} from '../../../../containers/detection_engine/rules';
import { useRulesTableContext } from './rules_table/rules_table_context';
import { useAsyncConfirmation } from './rules_table/use_async_confirmation';
import { getPrePackagedRuleStatus } from '../helpers';
import * as i18n from '../translations';
import { EuiBasicTableOnChange } from '../types';
import { useMonitoringColumns, useRulesColumns } from './use_columns';
import { showRulesTable } from './helpers';
import { RulesTableFilters } from './rules_table_filters/rules_table_filters';
import { AllRulesUtilityBar } from './utility_bar';
import { RULES_TABLE_PAGE_SIZE_OPTIONS } from '../../../../../../common/constants';
import { useTags } from '../../../../containers/detection_engine/rules/use_tags';
import { useCustomRulesCount } from './bulk_actions/use_custom_rules_count';
import { useBulkEditFormFlyout } from './bulk_actions/use_bulk_edit_form_flyout';
import { BulkEditConfirmation } from './bulk_actions/bulk_edit_confirmation';
import { BulkEditFlyout } from './bulk_actions/bulk_edit_flyout';
import { useBulkActions } from './bulk_actions/use_bulk_actions';

const INITIAL_SORT_FIELD = 'enabled';

interface RulesTableProps {
  createPrePackagedRules: CreatePreBuiltRules | null;
  hasPermissions: boolean;
  loading: boolean;
  loadingCreatePrePackagedRules: boolean;
  rulesCustomInstalled: number | null;
  rulesInstalled: number | null;
  rulesNotInstalled: number | null;
  rulesNotUpdated: number | null;
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
  ({
    createPrePackagedRules,
    hasPermissions,
    loading,
    loadingCreatePrePackagedRules,
    rulesCustomInstalled,
    rulesInstalled,
    rulesNotInstalled,
    rulesNotUpdated,
    selectedTab,
  }) => {
    const { timelines } = useKibana().services;
    const tableRef = useRef<EuiBasicTable>(null);
    const rulesTableContext = useRulesTableContext();

    const {
      state: {
        rules,
        filterOptions,
        isActionInProgress,
        isAllSelected,
        isFetched,
        isFetching,
        isLoading,
        isRefetching,
        isRefreshOn,
        lastUpdated,
        loadingRuleIds,
        loadingRulesAction,
        pagination,
        selectedRuleIds,
        sortingOptions,
      },
      actions: {
        reFetchRules,
        setFilterOptions,
        setIsAllSelected,
        setIsRefreshOn,
        setPage,
        setPerPage,
        setSelectedRuleIds,
        setSortingOptions,
      },
    } = rulesTableContext;

    const prePackagedRuleStatus = getPrePackagedRuleStatus(
      rulesInstalled,
      rulesNotInstalled,
      rulesNotUpdated
    );

    const [isLoadingTags, tags, reFetchTags] = useTags();

    const [isDeleteConfirmationVisible, showDeleteConfirmation, hideDeleteConfirmation] =
      useBoolState();

    const [confirmDeletion, handleDeletionConfirm, handleDeletionCancel] = useAsyncConfirmation({
      onInit: showDeleteConfirmation,
      onFinish: hideDeleteConfirmation,
    });

    const [isBulkEditConfirmationVisible, showBulkEditConfirmation, hideBulkEditConfirmation] =
      useBoolState();

    const [confirmBulkEdit, handleBulkEditConfirm, handleBulkEditCancel] = useAsyncConfirmation({
      onInit: showBulkEditConfirmation,
      onFinish: hideBulkEditConfirmation,
    });

    const { customRulesCount, isCustomRulesCountLoading } = useCustomRulesCount({
      enabled: isBulkEditConfirmationVisible && isAllSelected,
      filterOptions,
    });

    const {
      bulkEditActionType,
      isBulkEditFlyoutVisible,
      handleBulkEditFormConfirm,
      handleBulkEditFormCancel,
      completeBulkEditForm,
    } = useBulkEditFormFlyout();

    const selectedItemsCount = isAllSelected ? pagination.total : selectedRuleIds.length;
    const hasPagination = pagination.total > pagination.perPage;

    const [selectedElasticRuleIds, selectedCustomRuleIds] = useMemo(() => {
      const ruleImmutabilityMap = new Map(rules.map((rule) => [rule.id, rule.immutable]));
      const predicate = (id: string) => ruleImmutabilityMap.get(id);
      return partition(predicate, selectedRuleIds);
    }, [rules, selectedRuleIds]);

    const getBulkItemsPopoverContent = useBulkActions({
      filterOptions,
      confirmDeletion,
      confirmBulkEdit,
      completeBulkEditForm,
      reFetchTags,
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

    const onFilterChangedCallback = useCallback(
      (newFilter: Partial<FilterOptions>) => {
        setFilterOptions((currentFilter) => ({ ...currentFilter, ...newFilter }));
        setPage(1);
        setSelectedRuleIds([]);
        setIsAllSelected(false);
      },
      [setFilterOptions, setIsAllSelected, setPage, setSelectedRuleIds]
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

    const rulesColumns = useRulesColumns({ hasPermissions });
    const monitoringColumns = useMonitoringColumns({ hasPermissions });

    const handleCreatePrePackagedRules = useCallback(async () => {
      if (createPrePackagedRules != null) {
        await createPrePackagedRules();
        await reFetchRules();
      }
    }, [createPrePackagedRules, reFetchRules]);

    const isSelectAllCalled = useRef(false);

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

    const handleAutoRefreshSwitch = useCallback(
      (refreshOn: boolean) => {
        if (refreshOn) {
          reFetchRules();
        }
        setIsRefreshOn(refreshOn);
      },
      [setIsRefreshOn, reFetchRules]
    );

    const shouldShowRulesTable = useMemo(
      (): boolean => showRulesTable({ rulesCustomInstalled, rulesInstalled }) && !isLoading,
      [isLoading, rulesCustomInstalled, rulesInstalled]
    );

    const shouldShowPrepackagedRulesPrompt = useMemo(
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

    return (
      <>
        {isFetched && isRefetching && (
          <EuiProgress
            data-test-subj="loadingRulesInfoProgress"
            size="xs"
            position="absolute"
            color="accent"
          />
        )}
        {((!isFetched && isRefetching) || isActionInProgress) && (
          <Loader data-test-subj="loadingPanelAllRulesTable" overlay size="xl" />
        )}
        <HeaderSection
          split
          growLeftSplit={false}
          title={i18n.ALL_RULES}
          subtitle={timelines.getLastUpdated({
            showUpdating: loading || isFetching,
            updatedAt: lastUpdated,
          })}
        >
          {shouldShowRulesTable && (
            <RulesTableFilters
              onFilterChanged={onFilterChangedCallback}
              rulesCustomInstalled={rulesCustomInstalled}
              rulesInstalled={rulesInstalled}
              currentFilterTags={filterOptions.tags}
              isLoadingTags={isLoadingTags}
              tags={tags}
              reFetchTags={reFetchTags}
            />
          )}
        </HeaderSection>
        {shouldShowPrepackagedRulesPrompt && (
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
        {isBulkEditConfirmationVisible && !isCustomRulesCountLoading && (
          <BulkEditConfirmation
            customRulesCount={isAllSelected ? customRulesCount : selectedCustomRuleIds.length}
            elasticRulesCount={
              isAllSelected
                ? Math.max((pagination.total ?? 0) - customRulesCount, 0)
                : selectedElasticRuleIds.length
            }
            onCancel={handleBulkEditCancel}
            onConfirm={handleBulkEditConfirm}
          />
        )}
        {isBulkEditFlyoutVisible && bulkEditActionType !== undefined && (
          <BulkEditFlyout
            rulesCount={isAllSelected ? customRulesCount : selectedCustomRuleIds.length}
            editAction={bulkEditActionType}
            onClose={handleBulkEditFormCancel}
            onConfirm={handleBulkEditFormConfirm}
            tags={tags}
          />
        )}
        {shouldShowRulesTable && (
          <>
            <AllRulesUtilityBar
              canBulkEdit={hasPermissions}
              hasPagination={hasPagination}
              paginationTotal={pagination.total ?? 0}
              numberSelectedItems={selectedItemsCount}
              onGetBulkItemsPopoverContent={getBulkItemsPopoverContent}
              onRefresh={reFetchRules}
              isAutoRefreshOn={isRefreshOn}
              onRefreshSwitch={handleAutoRefreshSwitch}
              isAllSelected={isAllSelected}
              onToggleSelectAll={toggleSelectAll}
              isBulkActionInProgress={isCustomRulesCountLoading || loadingRulesAction != null}
              hasDisabledActions={loadingRulesAction != null}
              hasBulkActions
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
