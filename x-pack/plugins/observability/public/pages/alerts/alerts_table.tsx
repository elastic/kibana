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
import { usePluginContext } from '../../hooks/use_plugin_context';
import { AlertsFlyout } from './alerts_flyout';

/**
 * The type of an item in the alert list.
 *
 * The fields here are the minimum to make this work at this time, but
 * eventually this type should be derived from the schema of what is returned in
 * the API response.
 */
export interface AlertItem {
  '@timestamp': number;
  reason: string;
  severity: string;
  // These are just made up so we can make example links
  service?: { name?: string };
  pod?: string;
  log?: boolean;
  // Other fields used in the flyout
  actualValue?: string;
  affectedEntity?: string;
  expectedValue?: string;
  severityLog?: Array<{ '@timestamp': number; severity: string; message: string }>;
  status?: string;
  duration?: string;
  type?: string;
}

type AlertsTableProps = Omit<
  EuiBasicTableProps<AlertItem>,
  'columns' | 'isSelectable' | 'pagination' | 'selection'
>;

export function AlertsTable(props: AlertsTableProps) {
  const [flyoutAlert, setFlyoutAlert] = useState<AlertItem | undefined>(undefined);
  const handleFlyoutClose = () => setFlyoutAlert(undefined);
  const { prepend } = usePluginContext().core.http.basePath;

  // This is a contrived implementation of the reason field that shows how
  // you could link to certain types of resources based on what's contained
  // in their alert data.
  function reasonRenderer(text: string, item: AlertItem) {
    const serviceName = item.service?.name;
    const pod = item.pod;
    const log = item.log;

    if (serviceName) {
      return <EuiLink href={prepend(`/app/apm/services/${serviceName}`)}>{text}</EuiLink>;
    } else if (pod) {
      return <EuiLink href={prepend(`/app/metrics/link-to/host-detail/${pod}`)}>{text}</EuiLink>;
    } else if (log) {
      return <EuiLink href={prepend(`/app/logs/stream`)}>{text}</EuiLink>;
    } else {
      return <>{text}</>;
    }
  }

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
      dataType: 'string',
      render: reasonRenderer,
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
