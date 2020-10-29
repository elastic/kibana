/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiBasicTable,
  EuiLoadingContent,
  EuiSpacer,
  EuiTab,
  EuiTabs,
  EuiProgress,
} from '@elastic/eui';
import React, { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { useHistory } from 'react-router-dom';
import uuid from 'uuid';

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
import { HeaderSection } from '../../../../../common/components/header_section';
import { useKibana } from '../../../../../common/lib/kibana';
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
import { SecurityPageName } from '../../../../../app/types';
import { useFormatUrl } from '../../../../../common/components/link_to';
import { isBoolean } from '../../../../../common/utils/privileges';
import { AllRulesUtilityBar } from './utility_bar';
import { LastUpdatedAt } from '../../../../../common/components/last_updated';

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
};

interface AllRulesProps {
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
}

export enum AllRulesTabs {
  rules = 'rules',
  monitoring = 'monitoring',
}

const allRulesTabs = [
  {
    id: AllRulesTabs.rules,
    name: i18n.RULES_TAB,
    disabled: false,
  },
  {
    id: AllRulesTabs.monitoring,
    name: i18n.MONITORING_TAB,
    disabled: false,
  },
];

/**
 * Table Component for displaying all Rules for a given cluster. Provides the ability to filter
 * by name, sort by enabled, and perform the following actions:
 *   * Enable/Disable
 *   * Duplicate
 *   * Delete
 *   * Import/Export
 */
export const AllRules = React.memo<AllRulesProps>(
  ({
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
  }) => {
    const [initLoading, setInitLoading] = useState(true);
    const [lastUpdated, setLastUpdated] = useState<number>(Date.now());
    const tableRef = useRef<EuiBasicTable>();
    const [
      {
        exportRuleIds,
        filterOptions,
        loadingRuleIds,
        loadingRulesAction,
        pagination,
        rules,
        selectedRuleIds,
      },
      dispatch,
    ] = useReducer(allRulesReducer(tableRef), initialState);
    const { loading: isLoadingRulesStatuses, rulesStatuses } = useRulesStatuses(rules);
    const history = useHistory();
    const [, dispatchToaster] = useStateToaster();
    const mlCapabilities = useMlCapabilities();
    const [allRulesTab, setAllRulesTab] = useState(AllRulesTabs.rules);
    const { formatUrl } = useFormatUrl(SecurityPageName.detections);

    // TODO: Refactor license check + hasMlAdminPermissions to common check
    const hasMlPermissions = hasMlLicense(mlCapabilities) && hasMlAdminPermissions(mlCapabilities);

    const setRules = useCallback((newRules: Rule[], newPagination: Partial<PaginationOptions>) => {
      dispatch({
        type: 'setRules',
        rules: newRules,
        pagination: newPagination,
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
    const {
      services: {
        application: {
          capabilities: { actions },
        },
      },
    } = useKibana();

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
        pageSizeOptions: [5, 10, 20, 50, 100, 200, 300],
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

    const handleFilterChangedCallback = useCallback((newFilterOptions: Partial<FilterOptions>) => {
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

    const handleAllRulesTabClick = useCallback(
      (tabId: AllRulesTabs) => () => {
        setAllRulesTab(tabId);
      },
      []
    );

    const handleRefreshData = useCallback((): void => {
      if (reFetchRulesData != null && !isLoadingAnActionOnRule) {
        reFetchRulesData(true);
        setLastUpdated(Date.now());
      }
    }, [reFetchRulesData, isLoadingAnActionOnRule]);

    useEffect(() => {
      const refreshTimerId = window.setInterval(() => handleRefreshData(), 60000);

      return () => {
        clearInterval(refreshTimerId);
      };
    }, [handleRefreshData]);

    const tabs = useMemo(
      () => (
        <EuiTabs>
          {allRulesTabs.map((tab) => (
            <EuiTab
              data-test-subj={`allRulesTableTab-${tab.id}`}
              onClick={handleAllRulesTabClick(tab.id)}
              isSelected={tab.id === allRulesTab}
              disabled={tab.disabled}
              key={tab.id}
            >
              {tab.name}
            </EuiTab>
          ))}
        </EuiTabs>
      ),
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [allRulesTabs, allRulesTab, setAllRulesTab]
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
        <GenericDownloader
          filename={`${i18n.EXPORT_FILENAME}.ndjson`}
          ids={exportRuleIds}
          onExportSuccess={(exportCount) => {
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
          }}
          exportSelectedData={exportRules}
        />
        <EuiSpacer />
        {tabs}
        <EuiSpacer />

        <Panel loading={loading || isLoadingRules || isLoadingRulesStatuses}>
          <>
            {(isLoadingRules || isLoadingRulesStatuses) && (
              <EuiProgress
                data-test-subj="initialLoadingPanelMatrixOverTime"
                size="xs"
                position="absolute"
                color="accent"
              />
            )}
            <HeaderSection
              split
              title={i18n.ALL_RULES}
              subtitle={
                <LastUpdatedAt
                  showUpdating={loading || isLoadingRules || isLoadingRulesStatuses}
                  updatedAt={lastUpdated}
                />
              }
            >
              <RulesTableFilters
                onFilterChanged={handleFilterChangedCallback}
                rulesCustomInstalled={rulesCustomInstalled}
                rulesInstalled={rulesInstalled}
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
            {shouldShowRulesTable && (
              <>
                <AllRulesUtilityBar
                  userHasNoPermissions={hasNoPermissions}
                  paginationTotal={pagination.total ?? 0}
                  numberSelectedRules={selectedRuleIds.length}
                  onGetBatchItemsPopoverContent={getBatchItemsPopoverContent}
                  onRefresh={handleRefreshData}
                />
                <AllRulesTables
                  selectedTab={allRulesTab}
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

AllRules.displayName = 'AllRules';
