/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiBasicTable,
  EuiLoadingContent,
  EuiProgress,
  EuiOverlayMask,
  EuiConfirmModal,
  EuiWindowEvent,
} from '@elastic/eui';
import React, { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import uuid from 'uuid';
import { debounce } from 'lodash/fp';
import { History } from 'history';

import {
  useRules,
  useRulesStatuses,
  CreatePreBuiltRules,
  FilterOptions,
  Rule,
  PaginationOptions,
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
import { allRulesReducer, State } from './reducer';
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
const initialState: State = {
  exportRuleIds: [],
  filterOptions: {
    filter: '',
    sortField: INITIAL_SORT_FIELD,
    sortOrder: 'desc',
  },
  loadingRuleIds: [],
  loadingRulesAction: null,
  pagination: {
    page: 1,
    perPage: 20,
    total: 0,
  },
  rules: [],
  selectedRuleIds: [],
  lastUpdated: 0,
  showIdleModal: false,
  isRefreshOn: true,
};

interface RulesTableProps {
  history: History;
  formatUrl: FormatUrl;
  createPrePackagedRules: CreatePreBuiltRules | null;
  hasNoPermissions: boolean;
  loading: boolean;
  loadingCreatePrePackagedRules: boolean;
  refetchPrePackagedRulesStatus: () => void;
  rulesCustomInstalled: number | null;
  rulesInstalled: number | null;
  rulesNotInstalled: number | null;
  rulesNotUpdated: number | null;
  setRefreshRulesData: (refreshRule: (refreshPrePackagedRule?: boolean) => void) => void;
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
    const tableRef = useRef<EuiBasicTable>();
    const {
      services: {
        application: {
          capabilities: { actions },
        },
      },
    } = useKibana();
    const [defaultAutoRefreshSetting] = useUiSetting$<{
      on: boolean;
      value: number;
      idleTimeout: number;
    }>(DEFAULT_RULES_TABLE_REFRESH_SETTING);
    const [
      {
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
      },
      dispatch,
    ] = useReducer(allRulesReducer(tableRef), {
      ...initialState,
      lastUpdated: Date.now(),
      isRefreshOn: defaultAutoRefreshSetting.on,
    });
    const { loading: isLoadingRulesStatuses, rulesStatuses } = useRulesStatuses(rules);
    const [, dispatchToaster] = useStateToaster();
    const mlCapabilities = useMlCapabilities();

    // TODO: Refactor license check + hasMlAdminPermissions to common check
    const hasMlPermissions = hasMlLicense(mlCapabilities) && hasMlAdminPermissions(mlCapabilities);

    const setRules = useCallback((newRules: Rule[], newPagination: Partial<PaginationOptions>) => {
      dispatch({
        type: 'setRules',
        rules: newRules,
        pagination: newPagination,
      });
    }, []);

    const setShowIdleModal = useCallback((show: boolean) => {
      dispatch({
        type: 'setShowIdleModal',
        show,
      });
    }, []);

    const setLastRefreshDate = useCallback(() => {
      dispatch({
        type: 'setLastRefreshDate',
      });
    }, []);

    const setAutoRefreshOn = useCallback((on: boolean) => {
      dispatch({
        type: 'setAutoRefreshOn',
        on,
      });
    }, []);

    const [isLoadingRules, , reFetchRulesData] = useRules({
      pagination,
      filterOptions,
      refetchPrePackagedRulesStatus,
      dispatchRulesInReducer: setRules,
    });

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
          reFetchRules: reFetchRulesData,
          rules,
        });
      },
      [
        dispatch,
        dispatchToaster,
        hasMlPermissions,
        loadingRuleIds,
        reFetchRulesData,
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
        pageSizeOptions: [5, 10, 20, 50, 100, 200, 300, 400, 500],
      }),
      [pagination]
    );

    const tableOnChangeCallback = useCallback(
      ({ page, sort }: EuiBasicTableOnChange) => {
        dispatch({
          type: 'updateFilterOptions',
          filterOptions: {
            sortField: (sort?.field as RulesSortingFields) ?? INITIAL_SORT_FIELD, // Narrowing EuiBasicTable sorting types
            sortOrder: sort?.direction ?? 'desc',
          },
          pagination: { page: page.index + 1, perPage: page.size },
        });
      },
      [dispatch]
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
        reFetchRules: reFetchRulesData,
        hasReadActionsPrivileges: hasActionsPrivileges,
      });
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
      dispatch,
      dispatchToaster,
      formatUrl,
      hasMlPermissions,
      history,
      loadingRuleIds,
      loadingRulesAction,
      reFetchRulesData,
    ]);

    const monitoringColumns = useMemo(() => getMonitoringColumns(history, formatUrl), [
      history,
      formatUrl,
    ]);

    useEffect(() => {
      if (reFetchRulesData != null) {
        setRefreshRulesData(reFetchRulesData);
      }
    }, [reFetchRulesData, setRefreshRulesData]);

    useEffect(() => {
      if (initLoading && !loading && !isLoadingRules && !isLoadingRulesStatuses) {
        setInitLoading(false);
      }
    }, [initLoading, loading, isLoadingRules, isLoadingRulesStatuses]);

    const handleCreatePrePackagedRules = useCallback(async () => {
      if (createPrePackagedRules != null && reFetchRulesData != null) {
        await createPrePackagedRules();
        reFetchRulesData(true);
      }
    }, [createPrePackagedRules, reFetchRulesData]);

    const euiBasicTableSelectionProps = useMemo(
      () => ({
        selectable: (item: Rule) => !loadingRuleIds.includes(item.id),
        onSelectionChange: (selected: Rule[]) =>
          dispatch({ type: 'selectedRuleIds', ids: selected.map((r) => r.id) }),
      }),
      [loadingRuleIds]
    );

    const onFilterChangedCallback = useCallback((newFilterOptions: Partial<FilterOptions>) => {
      dispatch({
        type: 'updateFilterOptions',
        filterOptions: {
          ...newFilterOptions,
        },
        pagination: { page: 1 },
      });
    }, []);

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

    const handleRefreshData = useCallback((): void => {
      if (reFetchRulesData != null && !isLoadingAnActionOnRule) {
        reFetchRulesData(true);
        setLastRefreshDate();
      }
    }, [reFetchRulesData, isLoadingAnActionOnRule, setLastRefreshDate]);

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
          handleRefreshData();
        }
      }, defaultAutoRefreshSetting.value);

      return () => {
        clearInterval(interval);
      };
    }, [isRefreshOn, handleRefreshData, defaultAutoRefreshSetting.value]);

    const handleIdleModalContinue = useCallback((): void => {
      setShowIdleModal(false);
      handleRefreshData();
      setAutoRefreshOn(true);
    }, [setShowIdleModal, setAutoRefreshOn, handleRefreshData]);

    const handleAutoRefreshSwitch = useCallback(
      (refreshOn: boolean) => {
        if (refreshOn) {
          handleRefreshData();
        }
        setAutoRefreshOn(refreshOn);
      },
      [setAutoRefreshOn, handleRefreshData]
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
        dispatch({ type: 'loadingRuleIds', ids: [], actionType: null });
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
      [dispatchToaster]
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
            {(isLoadingRules || isLoadingRulesStatuses) && (
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
              <RulesTableFilters
                onFilterChanged={onFilterChangedCallback}
                rulesCustomInstalled={rulesCustomInstalled}
                rulesInstalled={rulesInstalled}
                currentFilterTags={filterOptions.tags ?? []}
              />
            </HeaderSection>

            {isLoadingAnActionOnRule && !initLoading && (
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
              <EuiOverlayMask>
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
              </EuiOverlayMask>
            )}
            {shouldShowRulesTable && (
              <>
                <AllRulesUtilityBar
                  userHasNoPermissions={hasNoPermissions}
                  paginationTotal={pagination.total ?? 0}
                  numberSelectedItems={selectedRuleIds.length}
                  onGetBatchItemsPopoverContent={getBatchItemsPopoverContent}
                  onRefresh={handleRefreshData}
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
