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

interface MaintenanceWindowsTableProps {
  loading: boolean;
  items: MaintenanceWindowResponse[];
}

export const MaintenanceWindowsTable = React.memo<MaintenanceWindowsTableProps>(
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
        render: (status: MaintenanceWindowResponse['status']) => {
          const display: Record<
            MaintenanceWindowResponse['status'],
            {
              color: 'warning' | 'success' | 'text';
              label: string;
            }
          > = {
            running: { color: 'warning', label: i18n.TABLE_STATUS_RUNNING },
            upcoming: { color: 'warning', label: i18n.TABLE_STATUS_UPCOMING },
            finished: { color: 'success', label: i18n.TABLE_STATUS_FINISHED },
            archived: { color: 'text', label: i18n.TABLE_STATUS_ARCHIVED },
          };
          return (
            <EuiButton
              css={styles.status}
              fill={status === 'running'}
              color={display[status].color}
              size="s"
              onClick={() => {}}
            >
              {display[status].label}
            </EuiButton>
          );
        },
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
        tableCaption="Maintenance Windows Table"
        items={items}
        columns={columns}
        pagination={true}
        sorting={true}
        selection={{
          onSelectionChange: (selection: MaintenanceWindowResponse[]) => setSelection(selection),
        }}
        isSelectable={true}
        rowProps={(item: MaintenanceWindowResponse) => ({ className: item.status })}
      />
    );
  }
);
MaintenanceWindowsTable.displayName = 'MaintenanceWindowsTable';
