/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useContext, useMemo, useCallback } from 'react';
import { EuiBasicTable, EuiPanel, EuiSpacer, EuiLink } from '@elastic/eui';
import { MonitorManagementList as MonitorManagementListState } from '../../../state/reducers/monitor_management';
import { MonitorFields } from '../../../../common/runtime_types';
import { UptimeSettingsContext } from '../../../contexts';
import { Actions } from './actions';
import { MonitorTags } from './tags';
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
  const { monitors, total, perPage, page: pageIndex } = list as MonitorManagementListState['list'];
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
      name: 'Monitor name',
      render: ({
        attributes: { name },
        id,
      }: {
        attributes: Partial<MonitorFields>;
        id: string;
      }) => (
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
      render: ({ type }: Partial<MonitorFields>) => type,
    },
    {
      align: 'left' as const,
      field: 'attributes',
      name: 'Tags',
      render: ({ tags }: Partial<MonitorFields>) => (tags ? <MonitorTags tags={tags} /> : null),
    },
    {
      align: 'left' as const,
      field: 'attributes',
      name: 'Schedule',
      render: ({ schedule }: Partial<MonitorFields>) =>
        `@every ${schedule?.number}${schedule?.unit}`,
    },
    {
      align: 'left' as const,
      field: 'attributes',
      name: 'URL',
      render: (attributes: Partial<MonitorFields>) => attributes.urls || attributes.hosts,
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
