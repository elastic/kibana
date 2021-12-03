/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useContext } from 'react';
import { EuiBasicTable, EuiPanel, EuiSpacer, EuiLink } from '@elastic/eui';
import { MonitorManagementList as MonitorManagementListState } from '../../../state/reducers/monitor_management';
import { MonitorFields } from '../../../../common/runtime_types/monitor_management';
import { UptimeSettingsContext } from '../../../contexts';
import { Actions } from './actions';
import { MonitorTags } from './tags';
import * as labels from '../../overview/monitor_list/translations';

interface Props {
  pageSize: number;
  setPageSize: (val: number) => void;
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
  pageSize,
  setPageSize,
}: Props) => {
  const items = list.monitors as MonitorManagementListState['list']['monitors'];
  const { basePath } = useContext(UptimeSettingsContext);

  const columns = [
    {
      align: 'left' as const,
      name: 'Monitor name',
      render: ({ attributes: { name }, id }: { attributes: MonitorFields; id: string }) => (
        <EuiLink
          href={`${basePath}/app/uptime/monitor/${Buffer.from(id, 'utf8').toString('base64')}`}
        >
          {name}
        </EuiLink>
      ),
      truncateText: true,
    },

    {
      align: 'left' as const,
      field: 'attributes',
      name: 'Monitor type',
      render: ({ type }: MonitorFields) => <p>{type}</p>,
    },
    {
      align: 'left' as const,
      field: 'attributes',
      name: 'Tags',
      render: ({ tags }: MonitorFields) => <MonitorTags tags={tags} />,
    },
    {
      align: 'left' as const,
      field: 'attributes',
      name: 'Schedule',
      render: ({ schedule: { number, unit } }: MonitorFields) => <p>{`@every ${number}${unit}`}</p>,
    },
    {
      align: 'left' as const,
      field: 'attributes',
      name: 'URL',
      render: (attributes: MonitorFields) => attributes.urls || attributes.hosts,
      truncateText: true,
    },
    {
      align: 'left' as const,
      field: 'id',
      name: 'Actions',
      render: (id: string) => <Actions id={id} setRefresh={setRefresh} />,
    },
  ];

  return (
    <EuiPanel hasBorder>
      <EuiSpacer size="m" />
      <EuiBasicTable
        aria-label={'Monitor management list'}
        error={error?.message}
        loading={loading}
        isExpandable={true}
        hasActions={true}
        itemId="monitor_id"
        items={items}
        columns={columns}
        tableLayout={'auto'}
        noItemsMessage={loading ? labels.LOADING : labels.NO_DATA_MESSAGE}
      />
    </EuiPanel>
  );
};
