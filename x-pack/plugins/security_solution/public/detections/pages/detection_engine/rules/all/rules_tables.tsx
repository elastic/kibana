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
import uuid from 'uuid';
import { debounce } from 'lodash/fp';
import { History } from 'history';

import {
  useRulesTable,
  useRulesStatuses,
  CreatePreBuiltRules,
  FilterOptions,
  Rule,
  exportRules,
  RulesSortingFields,
} from '../../../../containers/detection_engine/rules';

import { FormatUrl } from '../../../../../common/components/link_to';
import { HeaderSection } from '../../../../../common/components/header_section';
import { useKibana, useUiSetting$ } from '../../../../../common/lib/kibana';
import { useStateToaster } from '../../../../../common/components/toasters';
import { Loader } from '../../../../../common/components/loader';
import { Panel } from '../../../../../common/components/panel';
import { PrePackagedRulesPrompt } from '../../../../components/rules/pre_packaged_rules/load_empty_prompt';
import { GenericDownloader } from '../../../../../common/components/generic_downloader';
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
import { LastUpdatedAt } from '../../../../../common/components/last_updated';
import { DEFAULT_RULES_TABLE_REFRESH_SETTING } from '../../../../../../common/constants';
import { AllRulesTabs } from '.';

const INITIAL_SORT_FIELD = 'enabled';

interface RulesTableProps {
  history: History;
  formatUrl: FormatUrl;
  createPrePackagedRules: CreatePreBuiltRules | null;
  hasNoPermissions: boolean;
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
    hasNoPermissions,
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
      },
    } = useKibana();

    const tableRef = useRef<EuiBasicTable>();

    const [defaultAutoRefreshSetting] = useUiSetting$<{
      on: boolean;
      value: number;
      idleTimeout: number;
    }>(DEFAULT_RULES_TABLE_REFRESH_SETTING);

    const rulesTable = useRulesTable({
      tableRef,
      initialStateOverride: {
        isRefreshOn: defaultAutoRefreshSetting.on,
      },
    });

    const {
      exportRuleIds,
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
    } = rulesTable.state;

    const {
      dispatch,
      updateOptions,
      actionStopped,
      setShowIdleModal,
      setLastRefreshDate,
      setAutoRefreshOn,
      setIsRefreshing,
      reFetchRules,
    } = rulesTable;

    const { loading: isLoadingRulesStatuses, rulesStatuses } = useRulesStatuses(rules);
    const [, dispatchToaster] = useStateToaster();
    const mlCapabilities = useMlCapabilities();

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

    const hasActionsPrivileges = useMemo(() => (isBoolean(actions.show) ? actions.show : true), [
      actions,
    ]);

    const getBatchItemsPopoverContent = useCallback(
      (closePopover: () => void): JSX.Element[] => {
        return getBatchItems({
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
        });
      },
      [
        dispatch,
        dispatchToaster,
        hasMlPermissions,
        loadingRuleIds,
        reFetchRules,
        refetchPrePackagedRulesStatus,
        rules,
        selectedRuleIds,
        hasActionsPrivileges,
      ]
    );

    const paginationMemo = useMemo(
      () => ({
        pageIndex: pagination.page - 1,
        pageSize: pagination.perPage,
        totalItemCount: pagination.total,
        pageSizeOptions: [5, 10, 20, 50, 100, 200, 300, 400, 500, 600],
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
        hasNoPermissions,
        loadingRuleIds:
          loadingRulesAction != null &&
          (loadingRulesAction === 'enable' || loadingRulesAction === 'disable')
            ? loadingRuleIds
            : [],
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
      hasNoPermissions,
      hasMlPermissions,
      history,
      loadingRuleIds,
      loadingRulesAction,
      reFetchRules,
    ]);

    const monitoringColumns = useMemo(() => getMonitoringColumns(history, formatUrl), [
      history,
      formatUrl,
    ]);

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

    const euiBasicTableSelectionProps = useMemo(
      () => ({
        selectable: (item: Rule) => !loadingRuleIds.includes(item.id),
        onSelectionChange: (selected: Rule[]) =>
          dispatch({ type: 'selectedRuleIds', ids: selected.map((r) => r.id) }),
      }),
      [loadingRuleIds, dispatch]
    );

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

    const handleGenericDownloaderSuccess = useCallback(
      (exportCount) => {
        actionStopped();
        dispatchToaster({
          type: 'addToaster',
          toast: {
            id: uuid.v4(),
            title: i18n.SUCCESSFULLY_EXPORTED_RULES(exportCount),
            color: 'success',
            iconType: 'check',
          },
        });
      },
      [actionStopped, dispatchToaster]
    );

    return (
      <>
        <EuiWindowEvent event="mousemove" handler={debounceResetIdleTimer} />
        <EuiWindowEvent event="mousedown" handler={debounceResetIdleTimer} />
        <EuiWindowEvent event="click" handler={debounceResetIdleTimer} />
        <EuiWindowEvent event="keydown" handler={debounceResetIdleTimer} />
        <EuiWindowEvent event="scroll" handler={debounceResetIdleTimer} />
        <EuiWindowEvent event="load" handler={debounceResetIdleTimer} />
        <GenericDownloader
          filename={`${i18n.EXPORT_FILENAME}.ndjson`}
          ids={exportRuleIds}
          onExportSuccess={handleGenericDownloaderSuccess}
          exportSelectedData={exportRules}
        />

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
              subtitle={
                <LastUpdatedAt
                  showUpdating={loading || isLoadingRules || isLoadingRulesStatuses}
                  updatedAt={lastUpdated}
                />
              }
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
                userHasNoPermissions={hasNoPermissions}
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
            {shouldShowRulesTable && (
              <>
                <AllRulesUtilityBar
                  userHasNoPermissions={hasNoPermissions}
                  paginationTotal={pagination.total ?? 0}
                  numberSelectedItems={selectedRuleIds.length}
                  onGetBatchItemsPopoverContent={getBatchItemsPopoverContent}
                  onRefresh={handleManualRefresh}
                  isAutoRefreshOn={isRefreshOn}
                  onRefreshSwitch={handleAutoRefreshSwitch}
                  showBulkActions
                />
                <AllRulesTables
                  selectedTab={selectedTab}
                  euiBasicTableSelectionProps={euiBasicTableSelectionProps}
                  hasNoPermissions={hasNoPermissions}
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
