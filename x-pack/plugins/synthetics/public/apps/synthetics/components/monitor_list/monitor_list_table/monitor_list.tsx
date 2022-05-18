/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useContext } from 'react';
import {
  Criteria,
  EuiBasicTable,
  EuiBasicTableColumn,
  EuiTableSortingType,
  EuiLink,
  EuiPanel,
  EuiSpacer,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { IHttpSerializedFetchError } from '../../../state/utils/http_error';
import { MonitorListPageState } from '../../../state';
import { useCanEditSynthetics } from '../../../../../hooks/use_capabilities';
import {
  CommonFields,
  ConfigKey,
  ICMPSimpleFields,
  Ping,
  ServiceLocations,
  EncryptedSyntheticsSavedMonitor,
  TCPSimpleFields,
} from '../../../../../../common/runtime_types';
import { SyntheticsSettingsContext } from '../../../contexts/synthetics_settings_context';
import { useBreakpoints } from '../../../hooks';
import * as labels from './labels';
import { Actions } from './actions';
import { MonitorEnabled } from './monitor_enabled';
import { MonitorLocations } from './monitor_locations';
import { MonitorTags } from './tags';

interface Props {
  pageState: MonitorListPageState;
  syntheticsMonitors: EncryptedSyntheticsSavedMonitor[];
  error: IHttpSerializedFetchError | null;
  loading: boolean;
  loadPage: (state: MonitorListPageState) => void;
  reloadPage: () => void;
  errorSummaries?: Ping[];
}

export const MonitorList = ({
  pageState: { pageIndex, pageSize, sortField, sortOrder },
  syntheticsMonitors,
  error,
  loading,
  loadPage,
  reloadPage,
  errorSummaries,
}: Props) => {
  const { basePath } = useContext(SyntheticsSettingsContext);
  const isXl = useBreakpoints().up('xl');
  const canEditSynthetics = useCanEditSynthetics();

  const handleOnChange = useCallback(
    ({
      page = { index: 0, size: 10 },
      sort = { field: ConfigKey.NAME, direction: 'asc' },
    }: Criteria<EncryptedSyntheticsSavedMonitor>) => {
      const { index, size } = page;
      const { field, direction } = sort;

      loadPage({
        pageIndex: index,
        pageSize: size,
        sortField: `${field}.keyword`,
        sortOrder: direction,
      });
    },
    [loadPage]
  );

  const pagination = {
    pageIndex: pageIndex - 1, // page index for EuiBasicTable is base 0
    pageSize,
    totalItemCount: syntheticsMonitors.length || 0,
    pageSizeOptions: [5, 10, 25, 50, 100],
  };

  const sorting: EuiTableSortingType<EncryptedSyntheticsSavedMonitor> = {
    sort: {
      field: sortField.replace('.keyword', '') as keyof EncryptedSyntheticsSavedMonitor,
      direction: sortOrder,
    },
  };

  const columns = [
    {
      align: 'left' as const,
      field: ConfigKey.NAME as string,
      name: i18n.translate('xpack.synthetics.monitorManagement.monitorList.monitorName', {
        defaultMessage: 'Monitor name',
      }),
      sortable: true,
      render: (name: string, { id }: EncryptedSyntheticsSavedMonitor) => (
        <EuiLink href={`${basePath}/app/uptime/monitor/${btoa(id)}`}>{name}</EuiLink>
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
      truncateText: true,
      textOnly: true,
    },
    {
      align: 'left' as const,
      field: ConfigKey.ENABLED as string,
      name: i18n.translate('xpack.synthetics.monitorManagement.monitorList.enabled', {
        defaultMessage: 'Enabled',
      }),
      render: (_enabled: boolean, monitor: EncryptedSyntheticsSavedMonitor) => (
        <MonitorEnabled
          id={monitor.id}
          monitor={monitor}
          isDisabled={!canEditSynthetics}
          onUpdate={reloadPage}
        />
      ),
    },
    {
      align: 'left' as const,
      name: i18n.translate('xpack.synthetics.monitorManagement.monitorList.actions', {
        defaultMessage: 'Actions',
      }),
      render: (fields: EncryptedSyntheticsSavedMonitor) => (
        <Actions
          id={fields.id}
          name={fields[ConfigKey.NAME]}
          isDisabled={!canEditSynthetics}
          onUpdate={reloadPage}
          errorSummaries={errorSummaries}
          monitors={syntheticsMonitors}
        />
      ),
    },
  ] as Array<EuiBasicTableColumn<EncryptedSyntheticsSavedMonitor>>;

  return (
    <EuiPanel hasBorder>
      <EuiSpacer size="m" />
      <EuiBasicTable
        aria-label={i18n.translate('xpack.synthetics.monitorManagement.monitorList.title', {
          defaultMessage: 'Monitor Management list',
        })}
        error={error?.body?.message}
        loading={loading}
        isExpandable={true}
        hasActions={true}
        itemId="monitor_id"
        items={syntheticsMonitors}
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
