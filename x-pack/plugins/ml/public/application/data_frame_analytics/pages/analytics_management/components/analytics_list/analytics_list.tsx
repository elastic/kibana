/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, useCallback, useState, useEffect } from 'react';
import sortBy from 'lodash/sortBy';

import { i18n } from '@kbn/i18n';

import {
  Direction,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiBasicTable,
  EuiInMemoryTable,
  EuiSearchBar,
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
import { filterAnalytics, AnalyticsSearchBar } from './analytics_search_bar';
import { AnalyticsEmptyPrompt } from './empty_prompt';

const PAGE_SIZE = 10;
const PAGE_SIZE_OPTIONS = [2, 5, 10, 25, 50];

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
  const [filteredAnalytics, setFilteredAnalytics] = useState({
    active: false,
    items: [],
  });
  const [searchQueryText, setSearchQueryText] = useState('');
  const [analytics, setAnalytics] = useState<DataFrameAnalyticsListRow[]>([]);
  const [analyticsStats, setAnalyticsStats] = useState<AnalyticStatsBarStats | undefined>(
    undefined
  );
  const [expandedRowItemIds, setExpandedRowItemIds] = useState<DataFrameAnalyticsId[]>([]);
  const [errorMessage, setErrorMessage] = useState<any>(undefined);
  // Query text/job_id based on url but only after getAnalytics is done first
  // selectedJobIdFromUrlInitialized makes sure the query is only run once since analytics is being refreshed constantly
  const [selectedIdFromUrlInitialized, setSelectedIdFromUrlInitialized] = useState(false);
  const [tableSettings, setTableSettings] = useState<{
    pageIndex: number;
    pageSize: number;
    totalItemCount: number;
    hidePerPageOptions: boolean;
    sortField: string;
    sortDirection: Direction;
  }>({
    pageIndex: 0,
    pageSize: PAGE_SIZE,
    totalItemCount: 0,
    hidePerPageOptions: false,
    sortField: DataFrameAnalyticsListColumn.id,
    sortDirection: 'asc',
  });

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

  const getPageOfItems = (
    index: number,
    size: number,
    sortField: string,
    sortDirection: Direction
  ) => {
    let list = filteredAnalytics.active ? filteredAnalytics.items : analytics;
    // @ts-ignore
    list = sortBy(list, (item) => item[sortField]);
    list = sortDirection === 'asc' ? list : list.reverse();
    const listLength = list.length;

    let pageStart = index * size;
    if (pageStart >= listLength && listLength !== 0) {
      // if the page start is larger than the number of items due to
      // filters being applied or jobs being deleted, calculate a new page start
      pageStart = Math.floor((listLength - 1) / size) * size;

      setTableSettings({ ...tableSettings, pageIndex: pageStart / size });
    }
    return {
      pageOfItems: list.slice(pageStart, pageStart + size),
      totalItemCount: listLength,
    };
  };

  const setQueryClauses = (queryClauses: any) => {
    if (queryClauses.length) {
      const filtered = filterAnalytics(analytics, queryClauses);
      setFilteredAnalytics({ active: true, items: filtered });
    } else {
      setFilteredAnalytics({ active: false, items: [] });
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
    }
  }, [selectedIdFromUrlInitialized, analytics]);

  useEffect(() => {
    if (searchQueryText !== '' && selectedIdFromUrlInitialized === true) {
      // trigger table filtering with query for job id to trigger table filter
      const query = EuiSearchBar.Query.parse(searchQueryText);
      let clauses: any = [];
      if (query && query.ast !== undefined && query.ast.clauses !== undefined) {
        clauses = query.ast.clauses;
      }
      setQueryClauses(clauses);
    }
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
        <AnalyticsEmptyPrompt
          isManagementTable={isManagementTable}
          disabled={disabled}
          onCreateFirstJobClick={() => setIsSourceIndexModalVisible(true)}
        />
        {isSourceIndexModalVisible === true && (
          <SourceSelection onClose={() => setIsSourceIndexModalVisible(false)} />
        )}
      </>
    );
  }

  const { pageIndex, pageSize, sortField, sortDirection } = tableSettings;

  const { pageOfItems, totalItemCount } = getPageOfItems(
    pageIndex,
    pageSize,
    sortField,
    sortDirection
  );

  const pagination = {
    pageIndex,
    pageSize,
    totalItemCount,
    pageSizeOptions: PAGE_SIZE_OPTIONS,
  };

  const sorting = {
    sort: {
      field: sortField,
      direction: sortDirection,
    },
  };

  const onTableChange: EuiInMemoryTable<DataFrameAnalyticsListRow>['onTableChange'] = ({
    page = { index: 0, size: PAGE_SIZE },
    sort = { field: DataFrameAnalyticsListColumn.id, direction: 'asc' },
  }) => {
    const { index, size } = page;
    const { field, direction } = sort;

    setTableSettings({
      ...tableSettings,
      pageIndex: index,
      pageSize: size,
      sortField: field,
      sortDirection: direction,
    });
  };

  const itemIdToExpandedRowMap = getItemIdToExpandedRowMap(expandedRowItemIds, analytics);

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
        <AnalyticsSearchBar
          filters={filters}
          searchQueryText={searchQueryText}
          setQueryClauses={setQueryClauses}
        />
        <EuiSpacer size="l" />
        <EuiBasicTable
          className="mlAnalyticsTable"
          columns={columns}
          hasActions={false}
          isExpandable={true}
          isSelectable={false}
          items={pageOfItems}
          itemId={DataFrameAnalyticsListColumn.id}
          itemIdToExpandedRowMap={itemIdToExpandedRowMap}
          loading={isLoading}
          onChange={onTableChange}
          pagination={pagination}
          // @ts-ignore
          sorting={sorting}
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
