/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { Criteria, EuiBasicTable, EuiLink, EuiPanel, EuiSpacer } from '@elastic/eui';
import { EuiTableSortingType } from '@elastic/eui/src/components/basic_table/table_types';
import { i18n } from '@kbn/i18n';
import React, { useCallback, useContext, useMemo } from 'react';
import {
  CommonFields,
  ConfigKey,
  DataStream,
  FetchMonitorManagementListQueryArgs,
  SyntheticsMonitorWithId,
} from '../../../../common/runtime_types';
import { UptimeSettingsContext } from '../../../contexts';
import { MonitorManagementPageAction } from '../../../pages/monitor_management/monitor_management';
import { MonitorManagementList as MonitorManagementListState } from '../../../state/reducers/monitor_management';
import * as labels from '../../overview/monitor_list/translations';
import { Actions } from './actions';
import { MonitorEnabled } from './monitor_enabled';
import { MonitorLocations } from './monitor_locations';
import { MonitorTags } from './tags';

export interface MonitorManagementListPageState {
  pageIndex: number;
  pageSize: number;
  sortField: keyof typeof CommonFields;
  sortOrder: FetchMonitorManagementListQueryArgs['sortOrder'];
}

interface Props {
  pageState: MonitorManagementListPageState;
  monitorList: MonitorManagementListState;
  onPageStateChange: (state: MonitorManagementListPageState) => void;
  onUpdate: () => void;
}

export const MonitorManagementList = ({
  pageState: { pageIndex, pageSize, sortField, sortOrder },
  monitorList: {
    list,
    error: { monitorList: error },
    loading: { monitorList: loading },
  },
  onPageStateChange,
  onUpdate,
}: Props) => {
  const { basePath } = useContext(UptimeSettingsContext);

  const { total } = list as MonitorManagementListState['list'];
  const monitors: SyntheticsMonitorWithId[] = useMemo(
    () => list.monitors.map((monitor) => ({ ...monitor.attributes, id: monitor.id })),
    [list.monitors]
  );

  const handleOnChange = useCallback(
    ({ page = {}, sort = {} }: Criteria) => {
      const { index, size } = page;
      const { field, direction } = sort;

      onPageStateChange({
        pageIndex: index + 1, // page index for Saved Objects is base 1
        pageSize: size,
        sortField: field,
        sortOrder: direction,
      });
    },
    [onPageStateChange]
  );

  const pagination = {
    pageIndex: pageIndex - 1, // page index for EuiBasicTable is base 0
    pageSize,
    totalItemCount: total || 0,
    pageSizeOptions: [10, 25, 50, 100],
  };

  const sorting: EuiTableSortingType<SyntheticsMonitorWithId> = {
    sort: {
      field: sortField,
      direction: sortOrder,
    },
  };

  const columns: EuiBasicTableColumn<SyntheticsMonitorWithId> = [
    {
      align: 'left' as const,
      field: ConfigKey.NAME,
      name: i18n.translate('xpack.uptime.monitorManagement.monitorList.monitorName', {
        defaultMessage: 'Monitor name',
      }),
      sortable: true,
      render: (name, { id, type }) => (
        <EuiLink
          href={`${basePath}/app/uptime/monitor/${Buffer.from(
            /* Monitor Management currently only supports inline browser monitors.
             * Inline browser monitors append `inline` to the monitor id */
            `${id}${type === DataStream.BROWSER ? `-inline` : ''}`,
            'utf8'
          ).toString('base64')}`}
        >
          {name}
        </EuiLink>
      ),
      truncateText: true,
    },

    {
      align: 'left' as const,
      field: ConfigKey.MONITOR_TYPE,
      name: i18n.translate('xpack.uptime.monitorManagement.monitorList.monitorType', {
        defaultMessage: 'Monitor type',
      }),
      sortable: true,
    },
    {
      align: 'left' as const,
      field: ConfigKey.TAGS,
      name: i18n.translate('xpack.uptime.monitorManagement.monitorList.tags', {
        defaultMessage: 'Tags',
      }),
      render: (tags) => (tags ? <MonitorTags tags={tags} /> : null),
    },
    {
      align: 'left' as const,
      field: ConfigKey.LOCATIONS,
      name: i18n.translate('xpack.uptime.monitorManagement.monitorList.locations', {
        defaultMessage: 'Locations',
      }),
      render: (locations) => (locations ? <MonitorLocations locations={locations} /> : null),
    },
    {
      align: 'left' as const,
      field: ConfigKey.SCHEDULE,
      name: i18n.translate('xpack.uptime.monitorManagement.monitorList.schedule', {
        defaultMessage: 'Schedule',
      }),
      render: (schedule) => `@every ${schedule?.number}${schedule?.unit}`,
    },
    {
      align: 'left' as const,
      field: ConfigKey.URLS,
      name: i18n.translate('xpack.uptime.monitorManagement.monitorList.URL', {
        defaultMessage: 'URL',
      }),
      sortable: true,
      render: (urls, { hosts }) => urls || hosts,
      truncateText: true,
    },
    {
      align: 'left' as const,
      field: ConfigKey.ENABLED,
      name: i18n.translate('xpack.uptime.monitorManagement.monitorList.enabled', {
        defaultMessage: 'Enabled',
      }),
      render: (_enabled, monitor) => (
        <MonitorEnabled id={monitor.id} monitor={monitor} onUpdate={onUpdate} />
      ),
    },
    {
      align: 'left' as const,
      field: 'id',
      name: i18n.translate('xpack.uptime.monitorManagement.monitorList.actions', {
        defaultMessage: 'Actions',
      }),
      render: (id: string) => <Actions id={id} onUpdate={onUpdate} />,
    },
  ];

  return (
    <EuiPanel hasBorder>
      <EuiSpacer size="m" />
      <EuiBasicTable
        aria-label={i18n.translate('xpack.uptime.monitorManagement.monitorList.title', {
          defaultMessage: 'Monitor management list',
        })}
        error={error?.message}
        loading={loading}
        isExpandable={true}
        hasActions={true}
        itemId="monitor_id"
        items={monitors}
        columns={columns}
        tableLayout={'auto'}
        pagination={pagination}
        sorting={sorting}
        onChange={handleOnChange}
        noItemsMessage={loading ? labels.LOADING : labels.NO_DATA_MESSAGE}
      />
    </EuiPanel>
  );
};
