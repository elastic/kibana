/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useCallback, useMemo } from 'react';
import {
  formatDate,
  EuiBasicTableColumn,
  EuiFlexGroup,
  EuiFlexItem,
  EuiBadge,
  useEuiTheme,
  EuiButton,
  EuiBasicTable,
  EuiFieldSearch,
  EuiSpacer,
} from '@elastic/eui';
import { css } from '@emotion/react';
import * as i18n from '../translations';
import { useEditMaintenanceWindowsNavigation } from '../../../hooks/use_navigation';
import { STATUS_DISPLAY, STATUS_SORT } from '../constants';
import { UpcomingEventsPopover } from './upcoming_events_popover';
import {
  MaintenanceWindowStatus,
  MAINTENANCE_WINDOW_DATE_FORMAT,
  MaintenanceWindow,
} from '../../../../common';
import { StatusFilter } from './status_filter';
import { TableActionsPopover, TableActionsPopoverProps } from './table_actions_popover';
import { useFinishMaintenanceWindow } from '../../../hooks/use_finish_maintenance_window';
import { useArchiveMaintenanceWindow } from '../../../hooks/use_archive_maintenance_window';
import { useFinishAndArchiveMaintenanceWindow } from '../../../hooks/use_finish_and_archive_maintenance_window';

interface MaintenanceWindowsListProps {
  isLoading: boolean;
  items: MaintenanceWindow[];
  readOnly: boolean;
  refreshData: () => void;
  page: number;
  perPage: number;
  total: number;
  onPageChange: ({ page: { index, size } }: { page: { index: number; size: number } }) => void;
  onStatusChange: (status: MaintenanceWindowStatus[]) => void;
  selectedStatus: MaintenanceWindowStatus[];
  onSearchChange: (value: string) => void;
}

const COLUMNS: Array<EuiBasicTableColumn<MaintenanceWindow>> = [
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
    render: (startDate: string, item: MaintenanceWindow) => {
      return (
        <EuiFlexGroup responsive={false} alignItems="center">
          <EuiFlexItem grow={false}>
            {formatDate(startDate, MAINTENANCE_WINDOW_DATE_FORMAT)}
          </EuiFlexItem>
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
    render: (endDate: string) => formatDate(endDate, MAINTENANCE_WINDOW_DATE_FORMAT),
  },
];

const rowProps = (item: MaintenanceWindow) => ({
  className: item.status,
  'data-test-subj': 'list-item',
});

export const MaintenanceWindowsList = React.memo<MaintenanceWindowsListProps>(
  ({
    isLoading,
    items,
    readOnly,
    refreshData,
    page,
    perPage,
    total,
    onPageChange,
    selectedStatus,
    onStatusChange,
    onSearchChange,
  }) => {
    const { euiTheme } = useEuiTheme();
    const [search, setSearch] = useState<string>('');

    const { navigateToEditMaintenanceWindows } = useEditMaintenanceWindowsNavigation();
    const onEdit = useCallback<TableActionsPopoverProps['onEdit']>(
      (id) => navigateToEditMaintenanceWindows(id),
      [navigateToEditMaintenanceWindows]
    );
    const { mutate: finishMaintenanceWindow, isLoading: isLoadingFinish } =
      useFinishMaintenanceWindow();
    const onCancel = useCallback<TableActionsPopoverProps['onCancel']>(
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

    const isMutatingOrLoading = useMemo(() => {
      return isLoadingFinish || isLoadingArchive || isLoadingFinishAndArchive || isLoading;
    }, [isLoadingFinish, isLoadingArchive, isLoadingFinishAndArchive, isLoading]);

    const tableCss = useMemo(() => {
      return css`
        .euiTableRow {
          &.running {
            background-color: ${euiTheme.colors.highlight};
          }
        }
      `;
    }, [euiTheme.colors.highlight]);

    const actions: Array<EuiBasicTableColumn<MaintenanceWindow>> = useMemo(
      () => [
        {
          name: '',
          render: ({ status, id }: { status: MaintenanceWindowStatus; id: string }) => {
            return (
              <TableActionsPopover
                id={id}
                isLoading={isMutatingOrLoading}
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
      [isMutatingOrLoading, onArchive, onCancel, onCancelAndArchive, onEdit]
    );

    const columns = useMemo(
      () => (readOnly ? COLUMNS : COLUMNS.concat(actions)),
      [actions, readOnly]
    );

    const onInputChange = useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearch(e.target.value);
        if (e.target.value === '') {
          onSearchChange(e.target.value);
        }
      },
      [onSearchChange]
    );

    return (
      <>
        <EuiFlexItem grow={false}>
          <EuiFlexGroup>
            <EuiFlexItem>
              <EuiFieldSearch
                data-test-subj="maintenance-window-search"
                fullWidth
                isClearable
                incremental={false}
                placeholder={i18n.SEARCH_PLACEHOLDER}
                value={search}
                onChange={onInputChange}
                onSearch={onSearchChange}
              />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <StatusFilter selectedStatus={selectedStatus} onChange={onStatusChange} />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButton
                data-test-subj="refresh-button"
                iconType="refresh"
                onClick={refreshData}
                isLoading={isMutatingOrLoading}
                isDisabled={isMutatingOrLoading}
              >
                {i18n.REFRESH}
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiSpacer size="l" />
          <EuiFlexGroup>
            <EuiFlexItem>
              <EuiBasicTable
                data-test-subj="maintenance-windows-table"
                css={tableCss}
                itemId="id"
                loading={isMutatingOrLoading}
                tableCaption="Maintenance Windows List"
                items={items}
                columns={columns}
                pagination={{
                  pageIndex: page - 1,
                  pageSize: perPage,
                  pageSizeOptions: [10, 25, 50],
                  totalItemCount: total,
                }}
                rowProps={rowProps}
                onChange={onPageChange}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </>
    );
  }
);

MaintenanceWindowsList.displayName = 'MaintenanceWindowsList';
