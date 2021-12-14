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
      name: 'Duration',
      render: (lastExecutionDuration: number) => moment.duration(lastExecutionDuration).humanize(),
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
