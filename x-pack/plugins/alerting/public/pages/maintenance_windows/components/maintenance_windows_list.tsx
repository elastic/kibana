/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import {
  formatDate,
  EuiInMemoryTable,
  EuiBasicTableColumn,
  EuiFlexGroup,
  EuiFlexItem,
  SearchFilterConfig,
  EuiBadge,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { MaintenanceWindowFindResponse, SortDirection } from '../types';
import * as i18n from '../translations';
import { useEditMaintenanceWindowsNavigation } from '../../../hooks/use_navigation';
import { STATUS_DISPLAY, STATUS_SORT } from '../constants';
import { UpcomingEventsPopover } from './upcoming_events_popover';
import { MaintenanceWindowStatus } from '../../../../common';
import { StatusFilter } from './status_filter';
import { TableActionsPopover } from './table_actions_popover';
import { useFinishMaintenanceWindow } from '../../../hooks/use_finish_maintenance_window';
import { useArchiveMaintenanceWindow } from '../../../hooks/use_archive_maintenance_window';
import { useFinishAndArchiveMaintenanceWindow } from '../../../hooks/use_finish_and_archive_maintenance_window';

interface MaintenanceWindowsListProps {
  loading: boolean;
  items: MaintenanceWindowFindResponse[];
  readOnly: boolean;
  refreshData: () => void;
}

const COLUMNS: Array<EuiBasicTableColumn<MaintenanceWindowFindResponse>> = [
  {
    field: 'title',
    name: i18n.NAME,
    truncateText: true,
  },
  {
    field: 'status',
    name: i18n.TABLE_STATUS,
    'data-test-subj': 'maintenance-windows-column-status',
    render: (status: MaintenanceWindowStatus) => {
      return (
        <EuiBadge color={STATUS_DISPLAY[status].color}>{STATUS_DISPLAY[status].label}</EuiBadge>
      );
    },
    sortable: ({ status }) => STATUS_SORT[status],
  },
  {
    field: 'eventStartTime',
    name: i18n.TABLE_START_TIME,
    dataType: 'date',
    render: (startDate: string, item: MaintenanceWindowFindResponse) => {
      return (
        <EuiFlexGroup responsive={false} alignItems="center">
          <EuiFlexItem grow={false}>{formatDate(startDate, 'MM/DD/YY hh:mm A')}</EuiFlexItem>
          {item.events.length > 1 ? (
            <EuiFlexItem grow={false}>
              <UpcomingEventsPopover maintenanceWindowFindResponse={item} />
            </EuiFlexItem>
          ) : null}
        </EuiFlexGroup>
      );
    },
    sortable: true,
  },
  {
    field: 'eventEndTime',
    name: i18n.TABLE_END_TIME,
    dataType: 'date',
    render: (endDate: string) => formatDate(endDate, 'MM/DD/YY hh:mm A'),
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
  ({ loading, items, readOnly, refreshData }) => {
    const { euiTheme } = useEuiTheme();
    const { navigateToEditMaintenanceWindows } = useEditMaintenanceWindowsNavigation();
    const onEdit = useCallback(
      (id) => navigateToEditMaintenanceWindows(id),
      [navigateToEditMaintenanceWindows]
    );
    const { mutate: finishMaintenanceWindow, isLoading: isLoadingFinish } =
      useFinishMaintenanceWindow();
    const onCancel = useCallback(
      (id) => finishMaintenanceWindow(id, { onSuccess: () => refreshData() }),
      [finishMaintenanceWindow, refreshData]
    );
    const { mutate: archiveMaintenanceWindow, isLoading: isLoadingArchive } =
      useArchiveMaintenanceWindow();
    const onArchive = useCallback(
      (id: string, archive: boolean) =>
        archiveMaintenanceWindow(
          { maintenanceWindowId: id, archive },
          { onSuccess: () => refreshData() }
        ),
      [archiveMaintenanceWindow, refreshData]
    );
    const { mutate: finishAndArchiveMaintenanceWindow, isLoading: isLoadingFinishAndArchive } =
      useFinishAndArchiveMaintenanceWindow();
    const onCancelAndArchive = useCallback(
      (id: string) => finishAndArchiveMaintenanceWindow(id, { onSuccess: () => refreshData() }),
      [finishAndArchiveMaintenanceWindow, refreshData]
    );

    const tableCss = useMemo(() => {
      return css`
        .euiTableRow {
          &.running {
            background-color: ${euiTheme.colors.highlight};
          }
        }
      `;
    }, [euiTheme.colors.highlight]);

    const actions: Array<EuiBasicTableColumn<MaintenanceWindowFindResponse>> = useMemo(
      () => [
        {
          name: '',
          render: ({ status, id }: { status: MaintenanceWindowStatus; id: string }) => {
            return (
              <TableActionsPopover
                id={id}
                status={status}
                onEdit={onEdit}
                onCancel={onCancel}
                onArchive={onArchive}
                onCancelAndArchive={onCancelAndArchive}
              />
            );
          },
        },
      ],
      [onArchive, onCancel, onCancelAndArchive, onEdit]
    );

    const columns = useMemo(
      () => (readOnly ? COLUMNS : COLUMNS.concat(actions)),
      [actions, readOnly]
    );

    return (
      <EuiInMemoryTable
        data-test-subj="maintenance-windows-table"
        css={tableCss}
        itemId="id"
        loading={loading || isLoadingFinish || isLoadingArchive || isLoadingFinishAndArchive}
        tableCaption="Maintenance Windows List"
        items={items}
        columns={columns}
        pagination={true}
        sorting={sorting}
        rowProps={rowProps}
        search={search}
        hasActions={true}
      />
    );
  }
);
MaintenanceWindowsList.displayName = 'MaintenanceWindowsList';
