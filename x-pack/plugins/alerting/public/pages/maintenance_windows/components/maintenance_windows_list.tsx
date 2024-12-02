/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useEffect } from 'react';
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
} from '@elastic/eui';
import { css } from '@emotion/react';
import { SortDirection } from '../types';
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
  onPageChange: ({ page: { index, size } }: { page: { index: number, size: number } }) => void;
  inputText: string;
  onSearchKeyup: (e: any) => void;
  onSelectedStatusesChange: (statuses: MaintenanceWindowStatus[]) => void;
  selectedStatuses: MaintenanceWindowStatus[]
  onSearchChange: (e: any) => void
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

// use it!!
const sorting = {
  sort: {
    field: 'status',
    direction: SortDirection.asc,
  },
};

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
    inputText,
    selectedStatuses,
    onSelectedStatusesChange,
    onSearchKeyup,
    onSearchChange
  }) => {

    const { euiTheme } = useEuiTheme();

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
    useEffect(() => console.log('HERE2'), [])
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

    // const onTableChange = useCallback((props: { page: { index: number, size: number } }) => {
    //   onPageChange(props);
    // }, []);

    // const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    //   // onInputTextChange(e.target.value);
    //   // if (e.target.value === '') {
    //   //   onFilterChange(e.target.value);
    //   // }
    // };

    // const handleKeyup = (e: React.KeyboardEvent<HTMLInputElement>) => {
    //   // if (e.key === 'Enter') {
    //   //   onFilterChange(inputText);
    //   // }
    // };

    return (
      <>
        <EuiFlexGroup>
          <EuiFlexItem>
            <EuiFieldSearch
              data-test-subj="maintenance-window-search"
              fullWidth
              isClearable
              incremental={false} // which one is better? test!
              placeholder={i18n.SEARCH_PLACEHOLDER}
              value={inputText}
              onChange={onSearchChange}
              onKeyUp={onSearchKeyup}
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <StatusFilter selectedStatuses={selectedStatuses} onChange={onSelectedStatusesChange} />
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
      </>
    );
  }
);

MaintenanceWindowsList.displayName = 'MaintenanceWindowsList';
