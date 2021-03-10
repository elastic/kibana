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
import React, { useState } from 'react';
import { AlertsFlyout } from './alerts_flyout';

export interface AlertItem {
  '@timestamp': number;
  reason: string;
  severity: string;
}

type AlertsTableProps = Omit<
  EuiBasicTableProps<AlertItem>,
  'columns' | 'isSelectable' | 'pagination' | 'selection'
>;

export function AlertsTable(props: AlertsTableProps) {
  const [flyoutAlert, setFlyoutAlert] = useState<AlertItem | undefined>(undefined);
  const handleFlyoutClose = () => setFlyoutAlert(undefined);

  const actions: Array<DefaultItemAction<AlertItem>> = [
    {
      name: 'Alert details',
      description: 'Alert details',
      onClick: (item) => {
        setFlyoutAlert(item);
      },
      isPrimary: true,
    },
  ];

  const columns: Array<EuiBasicTableColumn<AlertItem>> = [
    {
      field: '@timestamp',
      name: 'Triggered',
      dataType: 'date',
    },
    {
      field: 'duration',
      name: 'Duration',
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

  return (
    <>
      {flyoutAlert && <AlertsFlyout {...flyoutAlert} onClose={handleFlyoutClose} />}
      <EuiBasicTable<AlertItem>
        {...props}
        isSelectable={true}
        selection={{} as EuiTableSelectionType<AlertItem>}
        columns={columns}
        pagination={{ pageIndex: 0, pageSize: 0, totalItemCount: 0 }}
      />
    </>
  );
}
