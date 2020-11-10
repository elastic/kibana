/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, useCallback, useState, useEffect } from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiInMemoryTable,
  EuiSearchBar,
  EuiSearchBarProps,
  EuiSpacer,
} from '@elastic/eui';
import { ANALYSIS_CONFIG_TYPE } from '../../../../../../../common/constants/data_frame_analytics';
import { DataFrameAnalyticsId, useRefreshAnalyticsList } from '../../../../common';
import { checkPermission } from '../../../../../capabilities/check_capabilities';

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
import {
  getSelectedIdFromUrl,
  getGroupQueryText,
} from '../../../../../jobs/jobs_list/components/utils';
import { SourceSelection } from '../source_selection';
import { filterAnalytics } from '../../../../common/search_bar_filters';
import { AnalyticsEmptyPrompt } from './empty_prompt';
import { useTableSettings } from './use_table_settings';
import { RefreshAnalyticsListButton } from '../refresh_analytics_list_button';

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
  blockRefresh?: boolean;
}
export const DataFrameAnalyticsList: FC<Props> = ({
  isManagementTable = false,
  isMlEnabledInSpace = true,
  blockRefresh = false,
}) => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isSourceIndexModalVisible, setIsSourceIndexModalVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [filteredAnalytics, setFilteredAnalytics] = useState<DataFrameAnalyticsListRow[]>([]);
  const [searchQueryText, setSearchQueryText] = useState('');
  const [searchError, setSearchError] = useState<string | undefined>();
  const [analytics, setAnalytics] = useState<DataFrameAnalyticsListRow[]>([]);
  const [analyticsStats, setAnalyticsStats] = useState<AnalyticStatsBarStats | undefined>(
    undefined
  );
  const [expandedRowItemIds, setExpandedRowItemIds] = useState<DataFrameAnalyticsId[]>([]);
  const [errorMessage, setErrorMessage] = useState<any>(undefined);
  // Query text/job_id based on url but only after getAnalytics is done first
  // selectedJobIdFromUrlInitialized makes sure the query is only run once since analytics is being refreshed constantly
  const [selectedIdFromUrlInitialized, setSelectedIdFromUrlInitialized] = useState(false);

  const disabled =
    !checkPermission('canCreateDataFrameAnalytics') ||
    !checkPermission('canStartStopDataFrameAnalytics');

  const getAnalytics = getAnalyticsFactory(
    setAnalytics,
    setAnalyticsStats,
    setErrorMessage,
    setIsInitialized,
    blockRefresh,
    isManagementTable
  );

  const updateFilteredItems = (queryClauses: any) => {
    if (queryClauses.length) {
      const filtered = filterAnalytics(analytics, queryClauses);
      setFilteredAnalytics(filtered);
    } else {
      setFilteredAnalytics(analytics);
    }
  };

  const filterList = () => {
    if (searchQueryText !== '' && selectedIdFromUrlInitialized === true) {
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
    if (selectedIdFromUrlInitialized === false && analytics.length > 0) {
      const { jobId, groupIds } = getSelectedIdFromUrl(window.location.href);
      let queryText = '';

      if (groupIds !== undefined) {
        queryText = getGroupQueryText(groupIds);
      } else if (jobId !== undefined) {
        queryText = jobId;
      }

      setSelectedIdFromUrlInitialized(true);
      setSearchQueryText(queryText);
    } else {
      filterList();
    }
  }, [selectedIdFromUrlInitialized, analytics]);

  useEffect(() => {
    filterList();
  }, [selectedIdFromUrlInitialized, searchQueryText]);

  const getAnalyticsCallback = useCallback(() => getAnalytics(true), []);

  // Subscribe to the refresh observable to trigger reloading the analytics list.
  useRefreshAnalyticsList(
    {
      isLoading: setIsLoading,
      onRefresh: getAnalyticsCallback,
    },
    isManagementTable
  );

  const { columns, modals } = useColumns(
    expandedRowItemIds,
    setExpandedRowItemIds,
    isManagementTable,
    isMlEnabledInSpace
  );

  const { onTableChange, pagination, sorting } = useTableSettings<DataFrameAnalyticsListRow>(
    DataFrameAnalyticsListColumn.id,
    filteredAnalytics
  );

  const handleSearchOnChange: EuiSearchBarProps['onChange'] = (search) => {
    if (search.error !== null) {
      setSearchError(search.error.message);
      return false;
    }

    setSearchError(undefined);
    setSearchQueryText(search.queryText);
    return true;
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

  if (analytics.length === 0) {
    return (
      <div data-test-subj="mlAnalyticsJobList">
        <AnalyticsEmptyPrompt
          isManagementTable={isManagementTable}
          disabled={disabled}
          onCreateFirstJobClick={() => setIsSourceIndexModalVisible(true)}
        />
        {isSourceIndexModalVisible === true && (
          <SourceSelection onClose={() => setIsSourceIndexModalVisible(false)} />
        )}
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
      {!isManagementTable && <EuiSpacer size="m" />}
      <EuiFlexGroup justifyContent="spaceBetween">
        {!isManagementTable && stats}
        {isManagementTable && managementStats}
        <EuiFlexItem grow={false}>
          <EuiFlexGroup alignItems="center" gutterSize="s">
            {!isManagementTable && (
              <EuiFlexItem grow={false}>
                <CreateAnalyticsButton
                  isDisabled={disabled}
                  setIsSourceIndexModalVisible={setIsSourceIndexModalVisible}
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
          className="mlAnalyticsInMemoryTable"
          columns={columns}
          error={searchError}
          hasActions={false}
          isExpandable={true}
          isSelectable={false}
          items={analytics}
          itemId={DataFrameAnalyticsListColumn.id}
          itemIdToExpandedRowMap={itemIdToExpandedRowMap}
          loading={isLoading}
          onTableChange={onTableChange}
          pagination={pagination}
          sorting={sorting}
          search={search}
          data-test-subj={isLoading ? 'mlAnalyticsTable loading' : 'mlAnalyticsTable loaded'}
          rowProps={(item) => ({
            'data-test-subj': `mlAnalyticsTableRow row-${item.id}`,
          })}
        />
      </div>

      {isSourceIndexModalVisible === true && (
        <SourceSelection onClose={() => setIsSourceIndexModalVisible(false)} />
      )}
    </div>
  );
};
