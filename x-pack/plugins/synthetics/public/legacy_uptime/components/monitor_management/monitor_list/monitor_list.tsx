/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  Criteria,
  EuiBasicTable,
  EuiBasicTableColumn,
  EuiLink,
  EuiPanel,
  EuiSpacer,
  EuiText,
  useIsWithinMinBreakpoint,
} from '@elastic/eui';
import { EuiTableSortingType } from '@elastic/eui/src/components/basic_table/table_types';
import { i18n } from '@kbn/i18n';
import React, { useCallback, useContext, useMemo } from 'react';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { PROJECT_LABEL } from '../../../../../common/translations/translations';
import {
  CommonFields,
  ConfigKey,
  FetchMonitorManagementListQueryArgs,
  ICMPSimpleFields,
  Ping,
  ServiceLocations,
  EncryptedSyntheticsMonitorWithId,
  TCPSimpleFields,
  BrowserFields,
} from '../../../../../common/runtime_types';
import { UptimeSettingsContext } from '../../../contexts';
import { MonitorManagementList as MonitorManagementListState } from '../../../state/reducers/monitor_management';
import * as labels from '../../overview/monitor_list/translations';
import { Actions } from './actions';
import { MonitorEnabled } from './monitor_enabled';
import { MonitorLocations } from './monitor_locations';
import { ManagementSettingsPortal } from './management_settings_portal';
import { MonitorTags } from './tags';

export interface MonitorManagementListPageState {
  pageIndex: number;
  pageSize: number;
  sortField:
    | `${ConfigKey.URLS}.keyword`
    | `${ConfigKey.NAME}.keyword`
    | `${ConfigKey.MONITOR_TYPE}.keyword`;
  sortOrder: NonNullable<FetchMonitorManagementListQueryArgs['sortOrder']>;
}

interface Props {
  pageState: MonitorManagementListPageState;
  monitorList: MonitorManagementListState;
  onPageStateChange: (state: MonitorManagementListPageState) => void;
  onUpdate: () => void;
  errorSummaries?: Ping[];
  statusSummaries?: Ping[];
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
  errorSummaries,
}: Props) => {
  const { basePath } = useContext(UptimeSettingsContext);
  const isXl = useIsWithinMinBreakpoint('xxl');

  const { total } = list as MonitorManagementListState['list'];
  const monitors: EncryptedSyntheticsMonitorWithId[] = useMemo(
    () =>
      list.monitors.map((monitor) => ({
        ...monitor.attributes,
      })),
    [list.monitors]
  );

  const handleOnChange = useCallback(
    ({
      page = { index: 0, size: 10 },
      sort = { field: ConfigKey.NAME, direction: 'asc' },
    }: Criteria<EncryptedSyntheticsMonitorWithId>) => {
      const { index, size } = page;
      const { field, direction } = sort;

      onPageStateChange({
        pageIndex: index + 1, // page index for Saved Objects is base 1
        pageSize: size,
        sortField: `${field}.keyword` as MonitorManagementListPageState['sortField'],
        sortOrder: direction,
      });
    },
    [onPageStateChange]
  );

  const pagination = {
    pageIndex: pageIndex - 1, // page index for EuiBasicTable is base 0
    pageSize,
    totalItemCount: total || 0,
    pageSizeOptions: [5, 10, 25, 50, 100],
  };

  const sorting: EuiTableSortingType<EncryptedSyntheticsMonitorWithId> = {
    sort: {
      field: sortField.replace('.keyword', '') as keyof EncryptedSyntheticsMonitorWithId,
      direction: sortOrder,
    },
  };

  const canEdit: boolean = !!useKibana().services?.application?.capabilities.uptime.save;

  const columns = [
    {
      align: 'left' as const,
      field: ConfigKey.NAME as string,
      name: i18n.translate('xpack.synthetics.monitorManagement.monitorList.monitorName', {
        defaultMessage: 'Monitor name',
      }),
      sortable: true,
      render: (name: string, monitor: EncryptedSyntheticsMonitorWithId) => (
        <EuiLink
          href={`${basePath}/app/uptime/monitor/${btoa(
            (monitor as unknown as BrowserFields)[ConfigKey.MONITOR_QUERY_ID]
          )}`}
        >
          {name}
        </EuiLink>
      ),
    },
    {
      align: 'left' as const,
      field: ConfigKey.MONITOR_TYPE,
      name: i18n.translate('xpack.synthetics.monitorManagement.monitorList.monitorType', {
        defaultMessage: 'Monitor type',
      }),
      sortable: true,
    },
    {
      align: 'left' as const,
      field: ConfigKey.TAGS,
      name: i18n.translate('xpack.synthetics.monitorManagement.monitorList.tags', {
        defaultMessage: 'Tags',
      }),
      render: (tags: string[]) => (tags ? <MonitorTags tags={tags} /> : null),
    },
    {
      align: 'left' as const,
      field: ConfigKey.LOCATIONS,
      name: i18n.translate('xpack.synthetics.monitorManagement.monitorList.locations', {
        defaultMessage: 'Locations',
      }),
      render: (locations: ServiceLocations) =>
        locations ? <MonitorLocations locations={locations} /> : null,
    },
    {
      align: 'left' as const,
      field: ConfigKey.PROJECT_ID,
      name: PROJECT_LABEL,
      render: (value: string) => (value ? <EuiText size="s">{value}</EuiText> : null),
    },
    {
      align: 'left' as const,
      field: ConfigKey.SCHEDULE,
      name: i18n.translate('xpack.synthetics.monitorManagement.monitorList.schedule', {
        defaultMessage: 'Frequency (min)',
      }),
      render: (schedule: CommonFields[ConfigKey.SCHEDULE]) => schedule?.number,
    },
    {
      align: 'left' as const,
      field: ConfigKey.URLS,
      name: i18n.translate('xpack.synthetics.monitorManagement.monitorList.URL', {
        defaultMessage: 'URL',
      }),
      sortable: true,
      render: (urls: string, { hosts }: TCPSimpleFields | ICMPSimpleFields) => urls || hosts,
      textOnly: true,
    },
    {
      align: 'left' as const,
      field: ConfigKey.ENABLED as string,
      name: i18n.translate('xpack.synthetics.monitorManagement.monitorList.enabled', {
        defaultMessage: 'Enabled',
      }),
      render: (_enabled: boolean, monitor: EncryptedSyntheticsMonitorWithId) => (
        <MonitorEnabled
          id={monitor[ConfigKey.CONFIG_ID]}
          monitor={monitor}
          isDisabled={!canEdit}
          onUpdate={onUpdate}
        />
      ),
    },
    {
      align: 'left' as const,
      name: i18n.translate('xpack.synthetics.monitorManagement.monitorList.actions', {
        defaultMessage: 'Actions',
      }),
      render: (fields: EncryptedSyntheticsMonitorWithId) => (
        <Actions
          key={fields[ConfigKey.CONFIG_ID]}
          configId={fields[ConfigKey.CONFIG_ID]}
          name={fields[ConfigKey.NAME]}
          isDisabled={!canEdit}
          onUpdate={onUpdate}
          errorSummaries={errorSummaries}
          monitors={list.monitors}
        />
      ),
    },
  ] as Array<EuiBasicTableColumn<EncryptedSyntheticsMonitorWithId>>;

  return (
    <EuiPanel hasBorder>
      <ManagementSettingsPortal />
      <EuiSpacer size="m" />
      <EuiBasicTable
        aria-label={i18n.translate('xpack.synthetics.monitorManagement.monitorList.title', {
          defaultMessage: 'Monitor Management list',
        })}
        error={error?.message}
        loading={loading}
        isExpandable={true}
        hasActions={true}
        itemId="monitor_id"
        items={monitors}
        columns={columns}
        tableLayout={isXl ? 'auto' : 'fixed'}
        pagination={pagination}
        sorting={sorting}
        onChange={handleOnChange}
        noItemsMessage={loading ? labels.LOADING : labels.NO_DATA_MESSAGE}
      />
    </EuiPanel>
  );
};
