/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import {
  formatDate,
  EuiInMemoryTable,
  EuiBasicTableColumn,
  EuiButton,
  useEuiBackgroundColor,
  SearchFilterConfig,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { MaintenanceWindowFindResponse, SortDirection } from '../types';
import * as i18n from '../translations';
import { StatusColor, STATUS_DISPLAY, STATUS_SORT } from '../constants';
import { MaintenanceWindowStatus } from '../../../../common';
import { StatusFilter } from './status_filter';

interface MaintenanceWindowsListProps {
  loading: boolean;
  items: MaintenanceWindowFindResponse[];
}

const columns: Array<EuiBasicTableColumn<MaintenanceWindowFindResponse>> = [
  {
    field: 'title',
    name: i18n.NAME,
    truncateText: true,
  },
  {
    field: 'status',
    name: i18n.TABLE_STATUS,
    render: (status: string) => {
      return (
        <EuiButton
          css={css`
            cursor: default;

            :hover:not(:disabled) {
              text-decoration: none;
            }
          `}
          fill={status === MaintenanceWindowStatus.Running}
          color={STATUS_DISPLAY[status].color as StatusColor}
          size="s"
          onClick={() => {}}
        >
          {STATUS_DISPLAY[status].label}
        </EuiButton>
      );
    },
    sortable: ({ status }) => STATUS_SORT[status],
  },
  {
    field: 'eventStartTime',
    name: i18n.TABLE_START_TIME,
    dataType: 'date',
    render: (startDate: string) => formatDate(startDate, 'MM/DD/YY HH:mm A'),
    sortable: true,
  },
  {
    field: 'eventEndTime',
    name: i18n.TABLE_END_TIME,
    dataType: 'date',
    render: (endDate: string) => formatDate(endDate, 'MM/DD/YY HH:mm A'),
  },
];

const sorting = {
  sort: {
    field: 'status',
    direction: SortDirection.asc,
  },
};

const rowProps = (item: MaintenanceWindowFindResponse) => ({
  className: item.status,
  'data-test-subj': 'list-item',
});

const search: { filters: SearchFilterConfig[] } = {
  filters: [
    {
      type: 'custom_component',
      component: StatusFilter,
    },
  ],
};

export const MaintenanceWindowsList = React.memo<MaintenanceWindowsListProps>(
  ({ loading, items }) => {
    const warningBackgroundColor = useEuiBackgroundColor('warning');
    const subduedBackgroundColor = useEuiBackgroundColor('subdued');
    const tableCss = useMemo(() => {
      return css`
        .euiTableRow {
          &.running {
            background-color: ${warningBackgroundColor};
          }

          &.archived {
            background-color: ${subduedBackgroundColor};
          }
        }
      `;
    }, [warningBackgroundColor, subduedBackgroundColor]);

    return (
      <EuiInMemoryTable
        css={tableCss}
        itemId="id"
        loading={loading}
        tableCaption="Maintenance Windows List"
        items={items}
        columns={columns}
        pagination={true}
        sorting={sorting}
        rowProps={rowProps}
        search={search}
      />
    );
  }
);
MaintenanceWindowsList.displayName = 'MaintenanceWindowsList';
