/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import moment from 'moment';
import { EuiInMemoryTable } from '@elastic/eui';

interface Props {
  metrics: unknown;
}

export const getKibanaMonitoringSectionApp: React.FC<Props> = ({ metrics }: Props) => {
  const items = metrics;
  const columns = [
    {
      field: 'rule.name',
      name: 'Name',
      sortable: true,
    },
    {
      field: 'rule.lastExecutionDuration',
      name: 'Last duration',
      // This is in nanoseconds
      render: (lastExecutionDuration: number) => `${lastExecutionDuration / (1000 * 1000)}ms`,
      sortable: true,
    },
    {
      field: 'rule.averageDrift',
      name: 'Average drift',
      render: (averageDrift: number) => `${averageDrift}ms`,
      // render: (averageDrift: number) => moment.duration(averageDrift, 'ms').humanize(),
      sortable: true,
    },
    {
      field: 'rule.averageDuration',
      name: 'Average duration',
      render: (averageDuration: number) => `${averageDuration}ms`,
      // render: (averageDuration: number) => {
      //   console.log({ averageDuration }, moment.duration(averageDuration, 'ms').humanize('seconds'))
      //   return moment.duration(averageDuration, 's').humanize();
      // },
      sortable: true,
    },
  ];
  return (
    <EuiInMemoryTable
      tableCaption="Demo of EuiInMemoryTable"
      items={items}
      columns={columns}
      pagination={true}
      sorting={true}
    />
  );
};
