/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, useState } from 'react';
import {
  Direction,
  EuiBadge,
  EuiInMemoryTable,
  EuiTableActionsColumnType,
  EuiTableComputedColumnType,
  EuiTableFieldDataColumnType,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { getAnalysisType } from '../../../data_frame_analytics/common/analytics';
import {
  DataFrameAnalyticsListColumn,
  DataFrameAnalyticsListRow,
} from '../../../data_frame_analytics/pages/analytics_management/components/analytics_list/common';
import {
  getTaskStateBadge,
  progressColumn,
} from '../../../data_frame_analytics/pages/analytics_management/components/analytics_list/use_columns';
import { getViewAction } from '../../../data_frame_analytics/pages/analytics_management/components/action_view';
import { formatHumanReadableDateTimeSeconds } from '../../../util/date_utils';

type DataFrameAnalyticsTableColumns = [
  EuiTableFieldDataColumnType<DataFrameAnalyticsListRow>,
  EuiTableComputedColumnType<DataFrameAnalyticsListRow>,
  EuiTableComputedColumnType<DataFrameAnalyticsListRow>,
  EuiTableComputedColumnType<DataFrameAnalyticsListRow>,
  EuiTableFieldDataColumnType<DataFrameAnalyticsListRow>,
  EuiTableActionsColumnType<DataFrameAnalyticsListRow>
];

interface Props {
  items: DataFrameAnalyticsListRow[];
}
export const AnalyticsTable: FC<Props> = ({ items }) => {
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  const [sortField, setSortField] = useState<string>(DataFrameAnalyticsListColumn.id);
  const [sortDirection, setSortDirection] = useState<Direction>('asc');

  // id, type, status, progress, created time, view icon
  const columns: DataFrameAnalyticsTableColumns = [
    {
      field: DataFrameAnalyticsListColumn.id,
      name: i18n.translate('xpack.ml.overview.analyticsList.id', { defaultMessage: 'ID' }),
      sortable: true,
      truncateText: true,
      width: '20%',
    },
    {
      name: i18n.translate('xpack.ml.overview.analyticsList.type', { defaultMessage: 'Type' }),
      sortable: (item: DataFrameAnalyticsListRow) => getAnalysisType(item.config.analysis),
      truncateText: true,
      render(item: DataFrameAnalyticsListRow) {
        return <EuiBadge color="hollow">{getAnalysisType(item.config.analysis)}</EuiBadge>;
      },
      width: '150px',
    },
    {
      name: i18n.translate('xpack.ml.overview.analyticsList.status', { defaultMessage: 'Status' }),
      sortable: (item: DataFrameAnalyticsListRow) => item.stats.state,
      truncateText: true,
      render(item: DataFrameAnalyticsListRow) {
        return getTaskStateBadge(item.stats.state, item.stats.failure_reason);
      },
      width: '100px',
    },
    progressColumn,
    {
      field: DataFrameAnalyticsListColumn.configCreateTime,
      name: i18n.translate('xpack.ml.overview.analyticsList.reatedTimeColumnName', {
        defaultMessage: 'Creation time',
      }),
      dataType: 'date',
      render: (time: number) => formatHumanReadableDateTimeSeconds(time),
      textOnly: true,
      truncateText: true,
      sortable: true,
      width: '20%',
    },
    {
      name: i18n.translate('xpack.ml.overview.analyticsList.tableActionLabel', {
        defaultMessage: 'Actions',
      }),
      actions: [getViewAction()],
      width: '100px',
    },
  ];

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

  const pagination = {
    initialPageIndex: pageIndex,
    initialPageSize: pageSize,
    totalItemCount: items.length,
    pageSizeOptions: [10, 20, 50],
    hidePerPageOptions: false,
  };

  const sorting = {
    sort: {
      field: sortField,
      direction: sortDirection,
    },
  };

  return (
    <EuiInMemoryTable
      allowNeutralSort={false}
      className="mlAnalyticsTable"
      columns={columns}
      hasActions={false}
      isExpandable={false}
      isSelectable={false}
      items={items}
      itemId={DataFrameAnalyticsListColumn.id}
      onTableChange={onTableChange}
      pagination={pagination}
      sorting={sorting}
      data-test-subj="mlOverviewTableAnalytics"
    />
  );
};
