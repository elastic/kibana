/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable complexity */

import {
  EuiBasicTable,
  EuiLoadingContent,
  EuiProgress,
  EuiConfirmModal,
  EuiWindowEvent,
} from '@elastic/eui';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { debounce } from 'lodash/fp';
import { History } from 'history';

import {
  useRulesTable,
  useRulesStatuses,
  CreatePreBuiltRules,
  FilterOptions,
  Rule,
  RulesSortingFields,
} from '../../../../containers/detection_engine/rules';

import { FormatUrl } from '../../../../../common/components/link_to';
import { HeaderSection } from '../../../../../common/components/header_section';
import { useKibana, useUiSetting$ } from '../../../../../common/lib/kibana';
import { useStateToaster } from '../../../../../common/components/toasters';
import { Loader } from '../../../../../common/components/loader';
import { Panel } from '../../../../../common/components/panel';
import { PrePackagedRulesPrompt } from '../../../../components/rules/pre_packaged_rules/load_empty_prompt';
import { AllRulesTables, SortingType } from '../../../../components/rules/all_rules_tables';
import { getPrePackagedRuleStatus } from '../helpers';
import * as i18n from '../translations';
import { EuiBasicTableOnChange } from '../types';
import { getBatchItems } from './batch_actions';
import { getColumns, getMonitoringColumns } from './columns';
import { showRulesTable } from './helpers';
import { RulesTableFilters } from './rules_table_filters/rules_table_filters';
import { useMlCapabilities } from '../../../../../common/components/ml/hooks/use_ml_capabilities';
import { hasMlAdminPermissions } from '../../../../../../common/machine_learning/has_ml_admin_permissions';
import { hasMlLicense } from '../../../../../../common/machine_learning/has_ml_license';
import { isBoolean } from '../../../../../common/utils/privileges';
import { AllRulesUtilityBar } from './utility_bar';
import { DEFAULT_RULES_TABLE_REFRESH_SETTING } from '../../../../../../common/constants';
import { AllRulesTabs } from '.';
import { useValueChanged } from '../../../../../common/hooks/use_value_changed';
import { convertRulesFilterToKQL } from '../../../../containers/detection_engine/rules/utils';
import { useBoolState } from '../../../../../common/hooks/use_bool_state';
import { useAsyncConfirmation } from '../../../../containers/detection_engine/rules/rules_table/use_async_confirmation';

const INITIAL_SORT_FIELD = 'enabled';

interface RulesTableProps {
  history: History;
  formatUrl: FormatUrl;
  createPrePackagedRules: CreatePreBuiltRules | null;
  hasPermissions: boolean;
  loading: boolean;
  loadingCreatePrePackagedRules: boolean;
  refetchPrePackagedRulesStatus: () => Promise<void>;
  rulesCustomInstalled: number | null;
  rulesInstalled: number | null;
  rulesNotInstalled: number | null;
  rulesNotUpdated: number | null;
  setRefreshRulesData: (refreshRule: () => Promise<void>) => void;
  selectedTab: AllRulesTabs;
}

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
    history,
    formatUrl,
    createPrePackagedRules,
    hasPermissions,
    loading,
    loadingCreatePrePackagedRules,
    refetchPrePackagedRulesStatus,
    rulesCustomInstalled,
    rulesInstalled,
    rulesNotInstalled,
    rulesNotUpdated,
    setRefreshRulesData,
    selectedTab,
  }) => {
    const [initLoading, setInitLoading] = useState(true);

    const {
      services: {
        application: {
          capabilities: { actions },
        },
        timelines,
      },
    } = useKibana();

    const tableRef = useRef<EuiBasicTable>(null);

    const [defaultAutoRefreshSetting] = useUiSetting$<{
      on: boolean;
      value: number;
      idleTimeout: number;
    }>(DEFAULT_RULES_TABLE_REFRESH_SETTING);

    const rulesTable = useRulesTable({
      initialStateOverride: {
        isRefreshOn: defaultAutoRefreshSetting.on,
      },
    });

    const {
      filterOptions,
      loadingRuleIds,
      loadingRulesAction,
      pagination,
      rules,
      selectedRuleIds,
      lastUpdated,
      showIdleModal,
      isRefreshOn,
      isRefreshing,
      isAllSelected,
    } = rulesTable.state;

    const {
      dispatch,
      updateOptions,
      setShowIdleModal,
      setLastRefreshDate,
      setAutoRefreshOn,
      setIsRefreshing,
      reFetchRules,
    } = rulesTable;

    const { loading: isLoadingRulesStatuses, rulesStatuses } = useRulesStatuses(rules);
    const [, dispatchToaster] = useStateToaster();
    const mlCapabilities = useMlCapabilities();
    const { navigateToApp } = useKibana().services.application;

    // TODO: Refactor license check + hasMlAdminPermissions to common check
    const hasMlPermissions = hasMlLicense(mlCapabilities) && hasMlAdminPermissions(mlCapabilities);

    const isLoadingRules = loadingRulesAction === 'load';
    const isLoadingAnActionOnRule = useMemo(() => {
      if (
        loadingRuleIds.length > 0 &&
        (loadingRulesAction === 'disable' || loadingRulesAction === 'enable')
      ) {
        return false;
      } else if (loadingRuleIds.length > 0) {
        return true;
      }
      return false;
    }, [loadingRuleIds, loadingRulesAction]);

    const sorting = useMemo(
      (): SortingType => ({
        sort: {
          field: filterOptions.sortField,
          direction: filterOptions.sortOrder,
        },
      }),
      [filterOptions]
    );

    const prePackagedRuleStatus = getPrePackagedRuleStatus(
      rulesInstalled,
      rulesNotInstalled,
      rulesNotUpdated
    );

    const hasActionsPrivileges = useMemo(
      () => (isBoolean(actions.show) ? actions.show : true),
      [actions]
    );

    const [isDeleteConfirmationVisible, showDeleteConfirmation, hideDeleteConfirmation] =
      useBoolState();

    const [confirmDeletion, handleDeletionConfirm, handleDeletionCancel] = useAsyncConfirmation({
      onInit: showDeleteConfirmation,
      onFinish: hideDeleteConfirmation,
    });

    const selectedItemsCount = isAllSelected ? pagination.total : selectedRuleIds.length;
    const hasPagination = pagination.total > pagination.perPage;

    const getBatchItemsPopoverContent = useCallback(
      (closePopover: () => void): JSX.Element[] => {
        return getBatchItems({
          isAllSelected,
          closePopover,
          dispatch,
          dispatchToaster,
          hasMlPermissions,
          hasActionsPrivileges,
          loadingRuleIds,
          selectedRuleIds,
          reFetchRules,
          refetchPrePackagedRulesStatus,
          rules,
          filterQuery: convertRulesFilterToKQL(filterOptions),
          confirmDeletion,
          selectedItemsCount,
        });
      },
      [
        isAllSelected,
        dispatch,
        dispatchToaster,
        hasMlPermissions,
        loadingRuleIds,
        reFetchRules,
        refetchPrePackagedRulesStatus,
        rules,
        selectedRuleIds,
        hasActionsPrivileges,
        filterOptions,
        confirmDeletion,
        selectedItemsCount,
      ]
    );

    const paginationMemo = useMemo(
      () => ({
        pageIndex: pagination.page - 1,
        pageSize: pagination.perPage,
        totalItemCount: pagination.total,
        pageSizeOptions: [5, 10, 20, 50, 100],
      }),
      [pagination]
    );

    const onFilterChangedCallback = useCallback(
      (newFilter: Partial<FilterOptions>) => {
        updateOptions(newFilter, { page: 1 });
      },
      [updateOptions]
    );

    const tableOnChangeCallback = useCallback(
      ({ page, sort }: EuiBasicTableOnChange) => {
        updateOptions(
          {
            sortField: (sort?.field as RulesSortingFields) ?? INITIAL_SORT_FIELD, // Narrowing EuiBasicTable sorting types
            sortOrder: sort?.direction ?? 'desc',
          },
          { page: page.index + 1, perPage: page.size }
        );
        setLastRefreshDate();
      },
      [updateOptions, setLastRefreshDate]
    );

    const rulesColumns = useMemo(() => {
      return getColumns({
        dispatch,
        dispatchToaster,
        formatUrl,
        history,
        hasMlPermissions,
        hasPermissions,
        loadingRuleIds:
          loadingRulesAction != null &&
          (loadingRulesAction === 'enable' || loadingRulesAction === 'disable')
            ? loadingRuleIds
            : [],
        navigateToApp,
        reFetchRules,
        refetchPrePackagedRulesStatus,
        hasReadActionsPrivileges: hasActionsPrivileges,
      });
    }, [
      dispatch,
      dispatchToaster,
      formatUrl,
      refetchPrePackagedRulesStatus,
      hasActionsPrivileges,
      hasPermissions,
      hasMlPermissions,
      history,
      loadingRuleIds,
      loadingRulesAction,
      navigateToApp,
      reFetchRules,
    ]);

    const monitoringColumns = useMemo(
      () => getMonitoringColumns(navigateToApp, formatUrl),
      [navigateToApp, formatUrl]
    );

    useEffect(() => {
      setRefreshRulesData(reFetchRules);
    }, [reFetchRules, setRefreshRulesData]);

    useEffect(() => {
      if (initLoading && !loading && !isLoadingRules && !isLoadingRulesStatuses) {
        setInitLoading(false);
      }
    }, [initLoading, loading, isLoadingRules, isLoadingRulesStatuses]);

    const handleCreatePrePackagedRules = useCallback(async () => {
      if (createPrePackagedRules != null) {
        await createPrePackagedRules();
        await reFetchRules();
        await refetchPrePackagedRulesStatus();
      }
    }, [createPrePackagedRules, reFetchRules, refetchPrePackagedRulesStatus]);

    const isSelectAllCalled = useRef(false);

    // Synchronize selectedRuleIds with EuiBasicTable's selected rows
    useValueChanged((ruleIds) => {
      if (tableRef.current?.changeSelection != null) {
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
            dispatch({ type: 'selectedRuleIds', ids: selected.map(({ id }) => id) });
          }
        },
      }),
      [loadingRuleIds, dispatch]
    );

    const toggleSelectAll = useCallback(() => {
      isSelectAllCalled.current = true;
      dispatch({ type: 'setIsAllSelected', isAllSelected: !isAllSelected });
    }, [dispatch, isAllSelected]);

    const refreshTable = useCallback(
      async (mode: 'auto' | 'manual' = 'manual'): Promise<void> => {
        if (isLoadingAnActionOnRule) {
          return;
        }

        const isAutoRefresh = mode === 'auto';
        if (isAutoRefresh) {
          setIsRefreshing(true);
        }

        await reFetchRules();
        await refetchPrePackagedRulesStatus();
        setLastRefreshDate();

        if (isAutoRefresh) {
          setIsRefreshing(false);
        }
      },
      [
        isLoadingAnActionOnRule,
        setIsRefreshing,
        reFetchRules,
        refetchPrePackagedRulesStatus,
        setLastRefreshDate,
      ]
    );

    const handleAutoRefresh = useCallback(async (): Promise<void> => {
      await refreshTable('auto');
    }, [refreshTable]);

    const handleManualRefresh = useCallback(async (): Promise<void> => {
      await refreshTable();
    }, [refreshTable]);

    const handleResetIdleTimer = useCallback((): void => {
      if (isRefreshOn) {
        setShowIdleModal(true);
        setAutoRefreshOn(false);
      }
    }, [setShowIdleModal, setAutoRefreshOn, isRefreshOn]);

    const debounceResetIdleTimer = useMemo(() => {
      return debounce(defaultAutoRefreshSetting.idleTimeout, handleResetIdleTimer);
    }, [handleResetIdleTimer, defaultAutoRefreshSetting.idleTimeout]);

    useEffect(() => {
      const interval = setInterval(() => {
        if (isRefreshOn) {
          handleAutoRefresh();
        }
      }, defaultAutoRefreshSetting.value);

      return () => {
        clearInterval(interval);
      };
    }, [isRefreshOn, handleAutoRefresh, defaultAutoRefreshSetting.value]);

    const handleIdleModalContinue = useCallback((): void => {
      setShowIdleModal(false);
      handleAutoRefresh();
      setAutoRefreshOn(true);
    }, [setShowIdleModal, setAutoRefreshOn, handleAutoRefresh]);

    const handleAutoRefreshSwitch = useCallback(
      (refreshOn: boolean) => {
        if (refreshOn) {
          handleAutoRefresh();
        }
        setAutoRefreshOn(refreshOn);
      },
      [setAutoRefreshOn, handleAutoRefresh]
    );

    const shouldShowRulesTable = useMemo(
      (): boolean => showRulesTable({ rulesCustomInstalled, rulesInstalled }) && !initLoading,
      [initLoading, rulesCustomInstalled, rulesInstalled]
    );

    const shouldShowPrepackagedRulesPrompt = useMemo(
      (): boolean =>
        rulesCustomInstalled != null &&
        rulesCustomInstalled === 0 &&
        prePackagedRuleStatus === 'ruleNotInstalled' &&
        !initLoading,
      [initLoading, prePackagedRuleStatus, rulesCustomInstalled]
    );

    return (
      <>
        <EuiWindowEvent event="mousemove" handler={debounceResetIdleTimer} />
        <EuiWindowEvent event="mousedown" handler={debounceResetIdleTimer} />
        <EuiWindowEvent event="click" handler={debounceResetIdleTimer} />
        <EuiWindowEvent event="keydown" handler={debounceResetIdleTimer} />
        <EuiWindowEvent event="scroll" handler={debounceResetIdleTimer} />
        <EuiWindowEvent event="load" handler={debounceResetIdleTimer} />
        <Panel
          loading={loading || isLoadingRules || isLoadingRulesStatuses}
          data-test-subj="allRulesPanel"
        >
          <>
            {!initLoading &&
              (loading || isLoadingRules || isLoadingAnActionOnRule) &&
              isRefreshing && (
                <EuiProgress
                  data-test-subj="loadingRulesInfoProgress"
                  size="xs"
                  position="absolute"
                  color="accent"
                />
              )}
            <HeaderSection
              split
              growLeftSplit={false}
              title={i18n.ALL_RULES}
              subtitle={timelines.getLastUpdated({
                showUpdating: loading || isLoadingRules || isLoadingRulesStatuses,
                updatedAt: lastUpdated,
              })}
            >
              {shouldShowRulesTable && (
                <RulesTableFilters
                  onFilterChanged={onFilterChangedCallback}
                  rulesCustomInstalled={rulesCustomInstalled}
                  rulesInstalled={rulesInstalled}
                  currentFilterTags={filterOptions.tags}
                />
              )}
            </HeaderSection>

            {!initLoading &&
              (loading || isLoadingRules || isLoadingAnActionOnRule) &&
              !isRefreshing && (
                <Loader data-test-subj="loadingPanelAllRulesTable" overlay size="xl" />
              )}

            {shouldShowPrepackagedRulesPrompt && (
              <PrePackagedRulesPrompt
                createPrePackagedRules={handleCreatePrePackagedRules}
                loading={loadingCreatePrePackagedRules}
                userHasPermissions={hasPermissions}
              />
            )}
            {initLoading && (
              <EuiLoadingContent data-test-subj="initialLoadingPanelAllRulesTable" lines={10} />
            )}
            {showIdleModal && (
              <EuiConfirmModal
                title={i18n.REFRESH_PROMPT_TITLE}
                onCancel={handleIdleModalContinue}
                onConfirm={handleIdleModalContinue}
                confirmButtonText={i18n.REFRESH_PROMPT_CONFIRM}
                defaultFocusedButton="confirm"
                data-test-subj="allRulesIdleModal"
              >
                <p>{i18n.REFRESH_PROMPT_BODY}</p>
              </EuiConfirmModal>
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
            {shouldShowRulesTable && (
              <>
                <AllRulesUtilityBar
                  canBulkEdit={hasPermissions}
                  hasPagination={hasPagination}
                  paginationTotal={pagination.total ?? 0}
                  numberSelectedItems={selectedItemsCount}
                  onGetBatchItemsPopoverContent={getBatchItemsPopoverContent}
                  onRefresh={handleManualRefresh}
                  isAutoRefreshOn={isRefreshOn}
                  onRefreshSwitch={handleAutoRefreshSwitch}
                  isAllSelected={isAllSelected}
                  onToggleSelectAll={toggleSelectAll}
                  showBulkActions
                />
                <AllRulesTables
                  selectedTab={selectedTab}
                  euiBasicTableSelectionProps={euiBasicTableSelectionProps}
                  hasPermissions={hasPermissions}
                  monitoringColumns={monitoringColumns}
                  pagination={paginationMemo}
                  rules={rules}
                  rulesColumns={rulesColumns}
                  rulesStatuses={rulesStatuses}
                  sorting={sorting}
                  tableOnChangeCallback={tableOnChangeCallback}
                  tableRef={tableRef}
                />
              </>
            )}
          </>
        </Panel>
      </>
    );
  }
);

RulesTables.displayName = 'RulesTables';
