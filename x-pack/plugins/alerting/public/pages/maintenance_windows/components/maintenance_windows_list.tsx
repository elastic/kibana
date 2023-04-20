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
  useEuiBackgroundColor,
  SearchFilterConfig,
  EuiBadge,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { MaintenanceWindowFindResponse, SortDirection } from '../types';
import * as i18n from '../translations';
import { useEditMaintenanceWindowsNavigation } from '../../../hooks/use_navigation';
import { STATUS_DISPLAY, STATUS_SORT } from '../constants';
import { MaintenanceWindowStatus } from '../../../../common';
import { StatusFilter } from './status_filter';
import { TableActionsPopover } from './table_actions_popover';
import { useFinishMaintenanceWindow } from '../../../hooks/use_finish_maintenance_window';
import { useArchiveMaintenanceWindow } from '../../../hooks/use_archive_maintenance_window';
import { useFinishAndArchiveMaintenanceWindow } from '../../../hooks/use_finish_and_archive_maintenance_window';

interface MaintenanceWindowsListProps {
  loading: boolean;
  items: MaintenanceWindowFindResponse[];
  refreshData: () => void;
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
    render: (status: MaintenanceWindowStatus) => {
      return <EuiBadge color="none">{STATUS_DISPLAY[status]}</EuiBadge>;
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
  ({ loading, items, refreshData }) => {
    const { euiTheme } = useEuiTheme();
    const warningBackgroundColor = useEuiBackgroundColor('warning');
    const successBackgroundColor = useEuiBackgroundColor('success');
    const subduedBackgroundColor = useEuiBackgroundColor('subdued');
    const { navigateToEditMaintenanceWindows } = useEditMaintenanceWindowsNavigation();
    const { mutate: finishMaintenanceWindow } = useFinishMaintenanceWindow();
    const { mutate: archiveMaintenanceWindow } = useArchiveMaintenanceWindow();
    const { mutate: finishAndArchiveMaintenanceWindow } = useFinishAndArchiveMaintenanceWindow();

    const tableCss = useMemo(() => {
      return css`
        .euiTableRow {
          &.running {
            background-color: ${warningBackgroundColor};
            .euiBadge {
              background-color: ${euiTheme.colors.warning};
              .euiBadge__text {
                color: ${euiTheme.colors.text};
              }
            }
          }
          &.upcoming {
            .euiBadge {
              background-color: ${warningBackgroundColor};
            }
            .euiBadge__text {
              color: ${euiTheme.colors.warningText};
            }
          }
          &.finished {
            .euiBadge {
              background-color: ${successBackgroundColor};
            }
            .euiBadge__text {
              color: ${euiTheme.colors.successText};
            }
          }
          &.archived {
            background-color: ${subduedBackgroundColor};
            .euiBadge {
              background-color: ${euiTheme.colors.lightestShade};
            }
            .euiBadge__text {
              color: ${euiTheme.colors.subduedText};
            }
          }
        }
      `;
    }, [
      warningBackgroundColor,
      subduedBackgroundColor,
      successBackgroundColor,
      euiTheme.colors.warning,
      euiTheme.colors.text,
      euiTheme.colors.warningText,
      euiTheme.colors.successText,
      euiTheme.colors.lightestShade,
      euiTheme.colors.subduedText,
    ]);

    const actions: Array<EuiBasicTableColumn<MaintenanceWindowFindResponse>> = [
      {
        name: '',
        render: ({ status, id }: { status: MaintenanceWindowStatus; id: string }) => {
          return (
            <TableActionsPopover
              status={status}
              onEdit={() => navigateToEditMaintenanceWindows(id)}
              onCancel={() => finishMaintenanceWindow(id, { onSuccess: () => refreshData() })}
              onArchive={(archive: boolean) =>
                archiveMaintenanceWindow(
                  { maintenanceWindowId: id, archive },
                  { onSuccess: () => refreshData() }
                )
              }
              onCancelAndArchive={() =>
                finishAndArchiveMaintenanceWindow(id, { onSuccess: () => refreshData() })
              }
            />
          );
        },
      },
    ];

    return (
      <EuiInMemoryTable
        css={tableCss}
        itemId="id"
        loading={loading}
        tableCaption="Maintenance Windows List"
        items={items}
        columns={columns.concat(actions)}
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
