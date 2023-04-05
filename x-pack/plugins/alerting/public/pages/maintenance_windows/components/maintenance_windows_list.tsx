/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  formatDate,
  EuiInMemoryTable,
  EuiBasicTableColumn,
  EuiButton,
  formatNumber,
  useEuiBackgroundColor,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { MaintenanceWindowResponse } from '../types';
import * as i18n from '../translations';
import { Status, STATUS_SORT } from '../constants';

interface MaintenanceWindowsListProps {
  loading: boolean;
  items: MaintenanceWindowResponse[];
}

export const MaintenanceWindowsList = React.memo<MaintenanceWindowsListProps>(
  ({ loading, items }) => {
    const [, setSelection] = useState<MaintenanceWindowResponse[]>([]);
    const styles = {
      status: css`
        cursor: default;

        :hover:not(:disabled) {
          text-decoration: none;
        }
      `,
      table: css`
        .euiTableRow {
          &.running {
            background-color: ${useEuiBackgroundColor('warning')};
          }

          &.archived {
            background-color: ${useEuiBackgroundColor('subdued')};
          }
        }
      `,
    };

    const columns: Array<EuiBasicTableColumn<MaintenanceWindowResponse>> = [
      {
        field: 'title',
        name: i18n.NAME,
        truncateText: true,
      },
      {
        field: 'total',
        name: 'Alerts',
        render: (alerts: number) => formatNumber(alerts, 'integer'),
      },
      {
        field: 'status',
        name: i18n.TABLE_STATUS,
        render: (status: string) => {
          const display: Record<
            string,
            {
              color: 'warning' | 'success' | 'text';
              label: string;
            }
          > = {
            [Status.RUNNING]: { color: 'warning', label: i18n.TABLE_STATUS_RUNNING },
            [Status.UPCOMING]: { color: 'warning', label: i18n.TABLE_STATUS_UPCOMING },
            [Status.FINISHED]: { color: 'success', label: i18n.TABLE_STATUS_FINISHED },
            [Status.ARCHIVED]: { color: 'text', label: i18n.TABLE_STATUS_ARCHIVED },
          };
          return (
            <EuiButton
              css={styles.status}
              fill={status === Status.RUNNING}
              color={display[status].color}
              size="s"
              onClick={() => {}}
            >
              {display[status].label}
            </EuiButton>
          );
        },
        sortable: ({ status }) => STATUS_SORT[status],
      },
      {
        field: 'eventStartTime',
        name: i18n.TABLE_START_TIME,
        dataType: 'date',
        render: (startDate: string) => formatDate(startDate, 'MM/DD/YY HH:MM A'),
        sortable: true,
      },
      {
        field: 'eventEndTime',
        name: i18n.TABLE_END_TIME,
        dataType: 'date',
        render: (endDate: string) => formatDate(endDate, 'MM/DD/YY HH:MM A'),
      },
    ];

    return (
      <EuiInMemoryTable
        css={styles.table}
        itemId="id"
        loading={loading}
        tableCaption="Maintenance Windows List"
        items={items}
        columns={columns}
        pagination={true}
        sorting={{
          sort: {
            field: 'status',
            direction: 'asc',
          },
        }}
        selection={{
          onSelectionChange: (selection: MaintenanceWindowResponse[]) => setSelection(selection),
        }}
        isSelectable={true}
        rowProps={(item: MaintenanceWindowResponse) => ({
          className: item.status,
          'data-test-subj': 'list-item',
        })}
      />
    );
  }
);
MaintenanceWindowsList.displayName = 'MaintenanceWindowsList';
