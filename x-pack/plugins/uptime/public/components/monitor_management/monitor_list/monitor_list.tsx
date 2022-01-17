/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useContext, useMemo, useCallback } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiBasicTable, EuiPanel, EuiSpacer, EuiLink } from '@elastic/eui';
import { SyntheticsMonitorSavedObject } from '../../../../common/types';
import { MonitorManagementList as MonitorManagementListState } from '../../../state/reducers/monitor_management';
import { DataStream, MonitorFields, SyntheticsMonitor } from '../../../../common/runtime_types';
import { UptimeSettingsContext } from '../../../contexts';
import { Actions } from './actions';
import { MonitorLocations } from './monitor_locations';
import { MonitorTags } from './tags';
import { MonitorEnabled } from './monitor_enabled';
import * as labels from '../../overview/monitor_list/translations';

interface Props {
  setPageSize: React.Dispatch<React.SetStateAction<number>>;
  setPageIndex: React.Dispatch<React.SetStateAction<number>>;
  setRefresh: React.Dispatch<React.SetStateAction<boolean>>;
  monitorList: MonitorManagementListState;
}

export const MonitorManagementList = ({
  monitorList: {
    list,
    error: { monitorList: error },
    loading: { monitorList: loading },
  },
  setRefresh,
  setPageSize,
  setPageIndex,
}: Props) => {
  const { total, perPage, page: pageIndex } = list as MonitorManagementListState['list'];
  const monitors = list.monitors as SyntheticsMonitorSavedObject[];
  const { basePath } = useContext(UptimeSettingsContext);

  const pagination = useMemo(
    () => ({
      pageIndex: pageIndex - 1, // page index for EuiBasicTable is base 0
      pageSize: perPage,
      totalItemCount: total || 0,
      pageSizeOptions: [10, 25, 50, 100],
    }),
    [pageIndex, perPage, total]
  );

  const handleOnChange = useCallback(
    ({ page = {} }) => {
      const { index, size } = page;

      setPageIndex(index + 1); // page index for Saved Objects is base 1
      setPageSize(size);
      setRefresh(true);
    },
    [setPageIndex, setPageSize, setRefresh]
  );

  const columns = [
    {
      align: 'left' as const,
      name: i18n.translate('xpack.uptime.monitorManagement.monitorList.monitorName', {
        defaultMessage: 'Monitor name',
      }),
      render: ({
        attributes: { name, type },
        id,
      }: {
        attributes: Partial<MonitorFields>;
        id: string;
      }) => (
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
      field: 'attributes',
      name: i18n.translate('xpack.uptime.monitorManagement.monitorList.monitorType', {
        defaultMessage: 'Monitor type',
      }),
      render: ({ type }: SyntheticsMonitor) => type,
    },
    {
      align: 'left' as const,
      field: 'attributes',
      name: i18n.translate('xpack.uptime.monitorManagement.monitorList.tags', {
        defaultMessage: 'Tags',
      }),
      render: ({ tags }: SyntheticsMonitor) => (tags ? <MonitorTags tags={tags} /> : null),
    },
    {
      align: 'left' as const,
      field: 'attributes',
      name: i18n.translate('xpack.uptime.monitorManagement.monitorList.locations', {
        defaultMessage: 'Locations',
      }),
      render: ({ locations }: SyntheticsMonitor) =>
        locations ? <MonitorLocations locations={locations} /> : null,
    },
    {
      align: 'left' as const,
      field: 'attributes',
      name: i18n.translate('xpack.uptime.monitorManagement.monitorList.schedule', {
        defaultMessage: 'Schedule',
      }),
      render: ({ schedule }: SyntheticsMonitor) => `@every ${schedule?.number}${schedule?.unit}`,
    },
    {
      align: 'left' as const,
      field: 'attributes',
      name: i18n.translate('xpack.uptime.monitorManagement.monitorList.URL', {
        defaultMessage: 'URL',
      }),
      render: (attributes: MonitorFields) => attributes.urls || attributes.hosts,
      truncateText: true,
    },
    {
      align: 'left' as const,
      field: 'attributes',
      name: i18n.translate('xpack.uptime.monitorManagement.monitorList.enabled', {
        defaultMessage: 'Enabled',
      }),
      render: (attributes: SyntheticsMonitor, record: SyntheticsMonitorSavedObject) => (
        <MonitorEnabled id={record.id} monitor={attributes} setRefresh={setRefresh} />
      ),
    },
    {
      align: 'left' as const,
      field: 'id',
      name: i18n.translate('xpack.uptime.monitorManagement.monitorList.actions', {
        defaultMessage: 'Actions',
      }),
      render: (id: string) => <Actions id={id} setRefresh={setRefresh} />,
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
        onChange={handleOnChange}
        noItemsMessage={loading ? labels.LOADING : labels.NO_DATA_MESSAGE}
      />
    </EuiPanel>
  );
};
