/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EuiBasicTable, EuiPanel, EuiSpacer } from '@elastic/eui';
import { MonitorManagementList as MonitorManagementListState } from '../../../state/reducers/monitor_management';

interface Props {
  pageSize: number;
  setPageSize: (val: number) => void;
  monitorList: MonitorManagementListState;
}

export const MonitorManagementList: ({
  monitorList: { list, error, loading },
  pageSize,
  setPageSize,
}: Props) => any = ({ monitorList: { list, error, loading }, pageSize, setPageSize }) => {
  const items = list.monitors ?? [];

  const columns = [
    {
      align: 'left' as const,
      field: 'attributes.name',
      name: 'Name',
      render: (name: string) => <p>{name}</p>,
    },
    {
      align: 'left' as const,
      field: 'attributes.type',
      name: 'Type',
      render: (type: string) => <p>{type}</p>,
    },
    {
      align: 'left' as const,
      field: 'attributes.schedule',
      name: 'Schedule',
      render: (schedule: { number: number; unit: string }) => (
        <p>{`@every ${schedule.number}${schedule.unit}`}</p>
      ),
    },
    {
      align: 'left' as const,
      field: 'attributes',
      name: 'URL',
      render: (attributes: Record<string, any>) => attributes.urls || attributes.hosts,
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
      />
    </EuiPanel>
  );
};
