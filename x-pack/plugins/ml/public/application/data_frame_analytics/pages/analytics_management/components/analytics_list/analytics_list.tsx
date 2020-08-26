/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, useCallback, useState, useEffect } from 'react';

import { i18n } from '@kbn/i18n';

import {
  Direction,
  EuiButton,
  EuiCallOut,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiInMemoryTable,
  EuiSearchBarProps,
  EuiSpacer,
} from '@elastic/eui';

import {
  DataFrameAnalyticsId,
  useRefreshAnalyticsList,
  ANALYSIS_CONFIG_TYPE,
} from '../../../../common';
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

  const [searchQueryText, setSearchQueryText] = useState('');

  const [analytics, setAnalytics] = useState<DataFrameAnalyticsListRow[]>([]);
  const [analyticsStats, setAnalyticsStats] = useState<AnalyticStatsBarStats | undefined>(
    undefined
  );
  const [expandedRowItemIds, setExpandedRowItemIds] = useState<DataFrameAnalyticsId[]>([]);

  const [errorMessage, setErrorMessage] = useState<any>(undefined);
  const [searchError, setSearchError] = useState<any>(undefined);

  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  const [sortField, setSortField] = useState<string>(DataFrameAnalyticsListColumn.id);
  const [sortDirection, setSortDirection] = useState<Direction>('asc');

  const disabled =
    !checkPermission('canCreateDataFrameAnalytics') ||
    !checkPermission('canStartStopDataFrameAnalytics');

  const getAnalytics = getAnalyticsFactory(
    setAnalytics,
    setAnalyticsStats,
    setErrorMessage,
    setIsInitialized,
    blockRefresh
  );

  // Query text/job_id based on url but only after getAnalytics is done first
  // selectedJobIdFromUrlInitialized makes sure the query is only run once since analytics is being refreshed constantly
  const [selectedIdFromUrlInitialized, setSelectedIdFromUrlInitialized] = useState(false);
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
    }
  }, [selectedIdFromUrlInitialized, analytics]);

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
      <>
        <EuiEmptyPrompt
          iconType="createAdvancedJob"
          title={
            <h2>
              {i18n.translate('xpack.ml.dataFrame.analyticsList.emptyPromptTitle', {
                defaultMessage: 'Create your first data frame analytics job',
              })}
            </h2>
          }
          actions={
            !isManagementTable
              ? [
                  <EuiButton
                    onClick={() => setIsSourceIndexModalVisible(true)}
                    isDisabled={disabled}
                    color="primary"
                    iconType="plusInCircle"
                    fill
                    data-test-subj="mlAnalyticsCreateFirstButton"
                  >
                    {i18n.translate('xpack.ml.dataFrame.analyticsList.emptyPromptButtonText', {
                      defaultMessage: 'Create job',
                    })}
                  </EuiButton>,
                ]
              : []
          }
          data-test-subj="mlNoDataFrameAnalyticsFound"
        />
        {isSourceIndexModalVisible === true && (
          <SourceSelection onClose={() => setIsSourceIndexModalVisible(false)} />
        )}
      </>
    );
  }

  const sorting = {
    sort: {
      field: sortField,
      direction: sortDirection,
    },
  };

  const itemIdToExpandedRowMap = getItemIdToExpandedRowMap(expandedRowItemIds, analytics);

  const pagination = {
    initialPageIndex: pageIndex,
    initialPageSize: pageSize,
    totalItemCount: analytics.length,
    pageSizeOptions: [10, 20, 50],
    hidePerPageOptions: false,
  };

  const handleSearchOnChange: EuiSearchBarProps['onChange'] = (search) => {
    if (search.error !== null) {
      setSearchError(search.error.message);
      return false;
    }

    setSearchError(undefined);
    setSearchQueryText(search.queryText);
    return true;
  };

  const search: EuiSearchBarProps = {
    query: searchQueryText,
    onChange: handleSearchOnChange,
    box: {
      incremental: true,
    },
    filters: [
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
    ],
  };

  const onTableChange: EuiInMemoryTable<DataFrameAnalyticsListRow>['onTableChange'] = ({
    page = { index: 0, size: 10 },
    sort = { field: DataFrameAnalyticsListColumn.id, direction: 'asc' },
  }) => {
    const { index, size } = page;
    setPageIndex(index);
    setPageSize(size);

    const { field, direction } = sort;
    setSortField(field);
    setSortDirection(direction);
  };

  return (
    <>
      {modals}
      <EuiSpacer size="m" />
      <EuiFlexGroup justifyContent="spaceBetween">
        <EuiFlexItem grow={false}>
          {analyticsStats && (
            <EuiFlexItem grow={false}>
              <StatsBar stats={analyticsStats} dataTestSub={'mlAnalyticsStatsBar'} />
            </EuiFlexItem>
          )}
        </EuiFlexItem>
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
        <EuiInMemoryTable
          allowNeutralSort={false}
          className="mlAnalyticsTable"
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
    </>
  );
};
