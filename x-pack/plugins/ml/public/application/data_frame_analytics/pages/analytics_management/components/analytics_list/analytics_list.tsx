/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useCallback, useState, useEffect } from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiInMemoryTable,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSearchBar,
  EuiSearchBarProps,
  EuiSpacer,
} from '@elastic/eui';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/public';
import { ANALYSIS_CONFIG_TYPE } from '../../../../../../../common/constants/data_frame_analytics';
import { DataFrameAnalyticsId, useRefreshAnalyticsList } from '../../../../common';
import { checkPermission } from '../../../../../capabilities/check_capabilities';
import { useNavigateToPath } from '../../../../../contexts/kibana';
import { ML_PAGES } from '../../../../../../../common/constants/locator';

import {
  DataFrameAnalyticsListColumn,
  DataFrameAnalyticsListRow,
  ItemIdToExpandedRowMap,
  DATA_FRAME_TASK_STATE,
} from './common';
import { getAnalyticsFactory } from '../../services/analytics_service';
import { getTaskStateBadge, getJobTypeBadge, useColumns } from './use_columns';
import { ExpandedRow } from './expanded_row';
import { AnalyticStatsBarStats, StatsBar } from '../../../../../components/stats_bar';
import { CreateAnalyticsButton } from '../create_analytics_button';
import { filterAnalytics } from '../../../../common/search_bar_filters';
import { AnalyticsEmptyPrompt } from '../empty_prompt';
import { useTableSettings } from './use_table_settings';
import { RefreshAnalyticsListButton } from '../refresh_analytics_list_button';
import { ListingPageUrlState } from '../../../../../../../common/types/common';
import { JobsAwaitingNodeWarning } from '../../../../../components/jobs_awaiting_node_warning';
import { useRefresh } from '../../../../../routing/use_refresh';

const filters: EuiSearchBarProps['filters'] = [
  {
    type: 'field_value_selection',
    field: 'job_type',
    name: i18n.translate('xpack.ml.dataframe.analyticsList.typeFilter', {
      defaultMessage: 'Type',
    }),
    multiSelect: 'or',
    options: Object.values(ANALYSIS_CONFIG_TYPE).map((val) => ({
      value: val,
      name: val,
      view: getJobTypeBadge(val),
    })),
  },
  {
    type: 'field_value_selection',
    field: 'state',
    name: i18n.translate('xpack.ml.dataframe.analyticsList.statusFilter', {
      defaultMessage: 'Status',
    }),
    multiSelect: 'or',
    options: Object.values(DATA_FRAME_TASK_STATE).map((val) => ({
      value: val,
      name: val,
      view: getTaskStateBadge(val),
    })),
  },
];

function getItemIdToExpandedRowMap(
  itemIds: DataFrameAnalyticsId[],
  dataFrameAnalytics: DataFrameAnalyticsListRow[]
): ItemIdToExpandedRowMap {
  return itemIds.reduce((m: ItemIdToExpandedRowMap, analyticsId: DataFrameAnalyticsId) => {
    const item = dataFrameAnalytics.find((analytics) => analytics.config.id === analyticsId);
    if (item !== undefined) {
      m[analyticsId] = <ExpandedRow item={item} />;
    }
    return m;
  }, {} as ItemIdToExpandedRowMap);
}

interface Props {
  isManagementTable?: boolean;
  isMlEnabledInSpace?: boolean;
  spacesApi?: SpacesPluginStart;
  blockRefresh?: boolean;
  pageState: ListingPageUrlState;
  updatePageState: (update: Partial<ListingPageUrlState>) => void;
}
export const DataFrameAnalyticsList: FC<Props> = ({
  isManagementTable = false,
  isMlEnabledInSpace = true,
  spacesApi,
  blockRefresh = false,
  pageState,
  updatePageState,
}) => {
  const navigateToPath = useNavigateToPath();

  const searchQueryText = pageState.queryText ?? '';
  const setSearchQueryText = useCallback(
    (value) => {
      updatePageState({ queryText: value });
    },
    [updatePageState]
  );
  const [isInitialized, setIsInitialized] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [filteredAnalytics, setFilteredAnalytics] = useState<DataFrameAnalyticsListRow[]>([]);
  const [searchError, setSearchError] = useState<string | undefined>();
  const [analytics, setAnalytics] = useState<DataFrameAnalyticsListRow[]>([]);
  const [analyticsStats, setAnalyticsStats] = useState<AnalyticStatsBarStats | undefined>(
    undefined
  );
  const [expandedRowItemIds, setExpandedRowItemIds] = useState<DataFrameAnalyticsId[]>([]);
  const [errorMessage, setErrorMessage] = useState<any>(undefined);
  const [jobsAwaitingNodeCount, setJobsAwaitingNodeCount] = useState(0);

  const refreshObs = useRefresh();

  const disabled =
    !checkPermission('canCreateDataFrameAnalytics') ||
    !checkPermission('canStartStopDataFrameAnalytics');

  const getAnalytics = getAnalyticsFactory(
    setAnalytics,
    setAnalyticsStats,
    setErrorMessage,
    setIsInitialized,
    setJobsAwaitingNodeCount,
    blockRefresh,
    isManagementTable
  );

  const updateFilteredItems = useCallback(
    (queryClauses: any[]) => {
      if (queryClauses.length) {
        const filtered = filterAnalytics(analytics, queryClauses);
        setFilteredAnalytics(filtered);
      } else {
        setFilteredAnalytics(analytics);
      }
    },
    [analytics]
  );

  const filterList = () => {
    if (searchQueryText !== '') {
      // trigger table filtering with query for job id to trigger table filter
      const query = EuiSearchBar.Query.parse(searchQueryText);
      let clauses: any = [];
      if (query && query.ast !== undefined && query.ast.clauses !== undefined) {
        clauses = query.ast.clauses;
      }
      updateFilteredItems(clauses);
    } else {
      updateFilteredItems([]);
    }
  };

  useEffect(() => {
    filterList();
  }, [searchQueryText]);

  const getAnalyticsCallback = useCallback(() => getAnalytics(true), []);

  // Subscribe to the refresh observable to trigger reloading the analytics list.
  const { refresh } = useRefreshAnalyticsList(
    {
      isLoading: setIsLoading,
      onRefresh: getAnalyticsCallback,
    },
    isManagementTable
  );

  useEffect(
    function updateOnTimerRefresh() {
      getAnalyticsCallback();
    },
    [refreshObs]
  );

  const { columns, modals } = useColumns(
    expandedRowItemIds,
    setExpandedRowItemIds,
    isManagementTable,
    isMlEnabledInSpace,
    spacesApi,
    refresh
  );

  const { onTableChange, pagination, sorting } = useTableSettings<DataFrameAnalyticsListRow>(
    filteredAnalytics,
    pageState,
    updatePageState
  );

  const navigateToSourceSelection = useCallback(async () => {
    await navigateToPath(ML_PAGES.DATA_FRAME_ANALYTICS_SOURCE_SELECTION);
  }, []);

  const handleSearchOnChange: EuiSearchBarProps['onChange'] = (search) => {
    if (search.error !== null) {
      setSearchError(search.error.message);
      return;
    }

    setSearchError(undefined);
    setSearchQueryText(search.queryText);
  };

  // Before the analytics have been loaded for the first time, display the loading indicator only.
  // Otherwise a user would see 'No data frame analytics found' during the initial loading.
  if (!isInitialized) {
    return null;
  }

  if (typeof errorMessage !== 'undefined') {
    return (
      <EuiCallOut
        title={i18n.translate('xpack.ml.dataFrame.analyticsList.errorPromptTitle', {
          defaultMessage: 'An error occurred getting the data frame analytics list.',
        })}
        color="danger"
        iconType="alert"
      >
        <pre>{JSON.stringify(errorMessage)}</pre>
      </EuiCallOut>
    );
  }

  if (analytics.length === 0 && !isManagementTable) {
    return (
      <div data-test-subj="mlAnalyticsJobList">
        <EuiSpacer size="m" />
        <AnalyticsEmptyPrompt />
      </div>
    );
  }

  const itemIdToExpandedRowMap = getItemIdToExpandedRowMap(expandedRowItemIds, analytics);

  const stats = analyticsStats && (
    <EuiFlexItem grow={false}>
      <StatsBar stats={analyticsStats} dataTestSub={'mlAnalyticsStatsBar'} />
    </EuiFlexItem>
  );

  const managementStats = (
    <EuiFlexItem>
      <EuiFlexGroup justifyContent="spaceBetween">
        {stats}
        <EuiFlexItem grow={false}>
          <RefreshAnalyticsListButton />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFlexItem>
  );

  const search: EuiSearchBarProps = {
    query: searchQueryText,
    onChange: handleSearchOnChange,
    box: {
      incremental: true,
    },
    filters,
  };

  return (
    <div data-test-subj="mlAnalyticsJobList">
      {modals}
      <JobsAwaitingNodeWarning jobCount={jobsAwaitingNodeCount} />
      <EuiFlexGroup justifyContent="spaceBetween">
        {!isManagementTable && stats}
        {isManagementTable && managementStats}
        <EuiFlexItem grow={false}>
          <EuiFlexGroup alignItems="center" gutterSize="s">
            {!isManagementTable && (
              <EuiFlexItem grow={false}>
                <CreateAnalyticsButton
                  isDisabled={disabled}
                  navigateToSourceSelection={navigateToSourceSelection}
                />
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="m" />
      <div data-test-subj="mlAnalyticsTableContainer">
        <EuiInMemoryTable<DataFrameAnalyticsListRow>
          allowNeutralSort={false}
          columns={columns}
          hasActions={false}
          isExpandable={true}
          itemIdToExpandedRowMap={itemIdToExpandedRowMap}
          isSelectable={false}
          items={analytics}
          itemId={DataFrameAnalyticsListColumn.id}
          loading={isLoading}
          onTableChange={onTableChange}
          pagination={pagination}
          sorting={sorting}
          search={search}
          data-test-subj={isLoading ? 'mlAnalyticsTable loading' : 'mlAnalyticsTable loaded'}
          rowProps={(item) => ({
            'data-test-subj': `mlAnalyticsTableRow row-${item.id}`,
          })}
          error={searchError}
        />
      </div>
    </div>
  );
};
