/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButtonEmpty,
  EuiDataGrid,
  EuiDataGridCellValueElementProps,
  EuiDataGridColumn,
  EuiDataGridControlColumn,
  EuiLink,
} from '@elastic/eui';
import moment from 'moment-timezone';
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
  // These items may be included in the schema (https://github.com/elastic/kibana/issues/93728):
  '@timestamp': number;
  'alert.duration.us'?: number;
  'alert.severity.level'?: string;
  'alert.severity.value'?: string;
  'alert.status'?: string;
  'evaluation.threshold'?: string;
  'rule.name'?: string;

  // These are either made up so we can make sample links, or could be included in the schema
  'service.name'?: string;
  pod?: string;
  log?: boolean;

  // These are used in example flyouts or are not yet reflected in the schema
  affectedEntity?: string;
  reason: string;
  severityLog?: Array<{ '@timestamp': number; severity: string; message: string }>;
}

interface AlertsTableProps {
  items: AlertItem[];
}

/**
 *  This is a contrived implementation of the reason field that shows how
 * you could link to certain types of resources based on what's contained
 * in their alert data.
 */
function ReasonRenderer(item: AlertItem) {
  const { prepend } = usePluginContext().core.http.basePath;
  const text = item.reason;
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

export function AlertsTable({ items }: AlertsTableProps) {
  const [flyoutAlert, setFlyoutAlert] = useState<AlertItem | undefined>(undefined);
  const handleFlyoutClose = () => setFlyoutAlert(undefined);

  function ActionCellRenderer({ rowIndex }: EuiDataGridCellValueElementProps) {
    const item = items[rowIndex];
    const handleClick = () => {
      setFlyoutAlert(item);
    };

    return <EuiButtonEmpty onClick={handleClick}>Alert details</EuiButtonEmpty>;
  }

  function CellValueRenderer({ columnId, rowIndex }: EuiDataGridCellValueElementProps) {
    const item = items[rowIndex];
    const value = item[columnId as keyof AlertItem];
    switch (columnId) {
      case '@timestamp':
        return <>{new Date(value as number).toISOString()}</>;
      case 'alert.duration.us':
        return <>{moment.duration((value as number) / 1000).humanize()}</>;
      case 'reason':
        return <ReasonRenderer {...item} />;
      default:
        return value ? <>{value}</> : null;
    }
  }

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
    { id: 'actions', headerCellRender: () => null, rowCellRender: ActionCellRenderer, width: 120 },
  ];

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
