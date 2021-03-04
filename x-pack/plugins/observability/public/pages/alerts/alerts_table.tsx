/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiBasicTable,
  EuiBasicTableColumn,
  EuiBasicTableProps,
  DefaultItemAction,
  EuiTableSelectionType,
  EuiLink,
} from '@elastic/eui';
import React from 'react';

export interface AlertItem {
  '@timestamp': string;
  reason: string;
  severity: string;
}

type AlertsTableProps = Omit<
  EuiBasicTableProps<AlertItem>,
  'columns' | 'isSelectable' | 'pagination' | 'selection'
>;

const actions: Array<DefaultItemAction<AlertItem>> = [
  {
    name: 'Alert details',
    description: 'Alert details',
    onClick: () => {},
    isPrimary: true,
  },
  {
    name: 'Open Alert',
    description: 'Open alert',
    onClick: () => {},
  },
  {
    name: 'Mark in progress',
    description: 'Mark in progress',
    onClick: () => {},
  },
  {
    name: 'Close alert',
    description: 'Close alert',
    onClick: () => {},
  },
];

const columns: Array<EuiBasicTableColumn<AlertItem>> = [
  {
    field: '@timestamp',
    name: 'Triggered',
  },
  {
    field: 'severity',
    name: 'Severity',
  },
  {
    field: 'reason',
    name: 'Reason',
    render: (text: string) => <EuiLink>{text}</EuiLink>,
  },
  {
    actions,
    name: 'Actions',
  },
];

export function AlertsTable(props: AlertsTableProps) {
  return (
    <EuiBasicTable<AlertItem>
      {...props}
      isSelectable={true}
      selection={[] as EuiTableSelectionType<AlertItem>}
      columns={columns}
      pagination={{ pageIndex: 0, pageSize: 0, totalItemCount: 0 }}
    />
  );
}
