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
  EuiDataGrid,
  EuiDataGridCellValueElementProps,
  EuiDataGridColumn,
  EuiDataGridControlColumn,
  DefaultItemAction,
  EuiTableSelectionType,
  EuiLink,
  EuiDataGridColumnActions,
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
  'alert.severity.level'?: string;
  // These are just made up so we can make example links
  'service.name'?: string;
  pod?: string;
  log?: boolean;
  // Other fields used in the flyout
  'alert.severity.value'?: string;
  affectedEntity?: string;
  expectedValue?: string;
  severityLog?: Array<{ '@timestamp': number; severity: string; message: string }>;
  status?: string;
  'alert.duration.us'?: number;
  type?: string;
}

type AlertsTableProps = Omit<
  EuiBasicTableProps<AlertItem>,
  'columns' | 'isSelectable' | 'pagination' | 'selection'
>;

export function AlertsTable({ items }: AlertsTableProps) {
  const [flyoutAlert, setFlyoutAlert] = useState<AlertItem | undefined>(undefined);
  const handleFlyoutClose = () => setFlyoutAlert(undefined);
  const { prepend } = usePluginContext().core.http.basePath;

  // This is a contrived implementation of the reason field that shows how
  // you could link to certain types of resources based on what's contained
  // in their alert data.
  function ReasonRenderer(props: AlertItem) {
    const item = props;
    const text = props.reason;
    const serviceName = item['service.name'];
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

  function ActionCellRenderer(props: EuiDataGridCellValueElementProps) {
    return null;
  }

  const actions: EuiDataGridColumnActions = [
    {
      name: 'Alert details',
      description: 'Alert details',
      onClick: (item) => {
        setFlyoutAlert(item);
      },
      isPrimary: true,
    },
  ];

  const columns: EuiDataGridColumn[] = [
    {
      id: '@timestamp',
      display: 'Triggered',
      schema: 'datetime',
    },
    {
      id: 'alert.duration.us',
      display: 'Duration',
    },
    {
      id: 'alert.severity.level',
      display: 'Severity',
    },
    {
      id: 'reason',
      display: 'Reason',
    },
  ];

  const trailingControlColumns: EuiDataGridControlColumn[] = [
    { id: 'actions', headerCellRender: () => null, rowCellRender: ActionCellRenderer, width: 40 },
  ];

  function CellValueRenderer({ columnId, rowIndex }: EuiDataGridCellValueElementProps) {
    const item = items[rowIndex];
    const value = item[columnId as keyof AlertItem];
    switch (columnId) {
      case '@timestamp':
        return <>{new Date(value as number).toISOString()}</>;
      case 'reason':
        return <ReasonRenderer {...item} />;
      default:
        return value ? <>{value}</> : null;
    }
  }

  const [visibleColumns, setVisibleColumns] = useState(columns.map(({ id }) => id));

  return (
    <>
      {flyoutAlert && <AlertsFlyout {...flyoutAlert} onClose={handleFlyoutClose} />}
      <EuiDataGrid
        aria-label="Observability alerts"
        columns={columns}
        columnVisibility={{ setVisibleColumns, visibleColumns }}
        renderCellValue={CellValueRenderer}
        rowCount={items.length}
        trailingControlColumns={trailingControlColumns}
      />
    </>
  );
}
