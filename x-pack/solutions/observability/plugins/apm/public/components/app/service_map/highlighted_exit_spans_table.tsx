/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBasicTable, EuiPanel, EuiTitle } from '@elastic/eui';
import type { EuiBasicTableColumn } from '@elastic/eui';

interface ExitSpanFields {
  'span.destination.service.resource'?: string;
  'span.subtype'?: string;
  'span.id'?: string;
  'span.type'?: string;
  'transaction.id'?: string;
  'service.node.name'?: string;
  'trace.id'?: string;
}

export interface HighlightedExitSpansTableProps {
  /**
   * Array of objects, each representing one exit span's fields.
   */
  items: ExitSpanFields[];
  /**
   * Optional title for the table.
   */
  title?: string;
}

const columns: Array<EuiBasicTableColumn<ExitSpanFields>> = [
  {
    field: 'destinationService',
    name: 'Destination Service',
    render: (value: string | undefined) => value || <em>—</em>,
  },
  {
    field: 'spanSubType',
    name: 'Subtype',
    render: (value: string | undefined) => value || <em>—</em>,
  },
  {
    field: 'spanId',
    name: 'Span ID',
    render: (value: string | undefined) => value || <em>—</em>,
  },
  {
    field: 'spanType',
    name: 'Span Type',
    render: (value: string | undefined) => value || <em>—</em>,
  },
  {
    field: 'transactionId',
    name: 'Transaction ID',
    render: (value: string | undefined) => value || <em>—</em>,
  },
  {
    field: 'serviceNodeName',
    name: 'Service Node',
    render: (value: string | undefined) => value || <em>—</em>,
  },
  {
    field: 'traceId',
    name: 'Trace ID',
    render: (value: string | undefined) => value || <em>—</em>,
  },
];

export function HighlightedExitSpansTable({ items, title }: HighlightedExitSpansTableProps) {
  return (
    <EuiPanel hasBorder>
      <EuiBasicTable
        items={items}
        columns={columns}
        tableLayout="auto"
        data-test-subj="apmServiceMapHighlightedExitSpansTable"
      />
    </EuiPanel>
  );
}
