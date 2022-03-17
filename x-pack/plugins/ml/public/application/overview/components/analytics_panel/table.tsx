/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useState } from 'react';
import { Direction, EuiBadge, EuiBasicTableColumn, EuiInMemoryTable } from '@elastic/eui';
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
import { formatHumanReadableDateTime } from '../../../../../common/util/date_utils';

import { useTableActions } from './actions';

interface Props {
  items: DataFrameAnalyticsListRow[];
}
export const AnalyticsTable: FC<Props> = ({ items }) => {
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  const [sortField, setSortField] = useState<string>(DataFrameAnalyticsListColumn.id);
  const [sortDirection, setSortDirection] = useState<Direction>('asc');

  const columns: Array<EuiBasicTableColumn<DataFrameAnalyticsListRow>> = [
    {
      field: DataFrameAnalyticsListColumn.id,
      name: i18n.translate('xpack.ml.overview.analyticsList.id', { defaultMessage: 'ID' }),
      sortable: true,
      truncateText: false,
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
      render: (time: number) => formatHumanReadableDateTime(time),
      textOnly: true,
      truncateText: true,
      sortable: true,
      width: '25%',
    },
    {
      name: i18n.translate('xpack.ml.overview.analyticsList.tableActionLabel', {
        defaultMessage: 'Actions',
      }),
      actions: useTableActions(),
      width: '80px',
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
    showPerPageOptions: true,
  };

  const sorting = {
    sort: {
      field: sortField,
      direction: sortDirection,
    },
  };

  return (
    <EuiInMemoryTable<DataFrameAnalyticsListRow>
      allowNeutralSort={false}
      className="mlAnalyticsTable"
      columns={columns}
      hasActions={true}
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
