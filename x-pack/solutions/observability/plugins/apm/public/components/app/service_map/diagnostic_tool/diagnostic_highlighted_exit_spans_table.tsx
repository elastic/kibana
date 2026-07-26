/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBasicTable, EuiPanel } from '@elastic/eui';
import type { EuiBasicTableColumn } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { ExitSpanFields } from '../../../../../common/service_map_diagnostic_types';

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
    name: i18n.translate('xpack.apm.serviceMap.diagnosticResults.table.destinationService', {
      defaultMessage: 'Destination Service',
    }),
    render: (value: string | undefined, item: ExitSpanFields) => <div>{value || <em>—</em>}</div>,
  },
  {
    field: 'agentName',
    name: i18n.translate('xpack.apm.serviceMap.diagnosticResults.table.agentName', {
      defaultMessage: 'Agent',
    }),
    render: (value: string | undefined) => value || <em>—</em>,
  },
  {
    field: 'spanId',
    name: i18n.translate('xpack.apm.serviceMap.diagnosticResults.table.spanId', {
      defaultMessage: 'Span ID',
    }),
    render: (value: string | undefined) => value || <em>—</em>,
  },
  {
    field: 'transactionId',
    name: i18n.translate('xpack.apm.serviceMap.diagnosticResults.table.transactionId', {
      defaultMessage: 'Transaction ID',
    }),
    render: (value: string | undefined) => value || <em>—</em>,
  },
  {
    field: 'serviceNodeName',
    name: i18n.translate('xpack.apm.serviceMap.diagnosticResults.table.serviceNode', {
      defaultMessage: 'Service Node',
    }),
    render: (value: string | undefined) => value || <em>—</em>,
  },
  {
    field: 'traceId',
    name: i18n.translate('xpack.apm.serviceMap.diagnosticResults.table.traceId', {
      defaultMessage: 'Trace ID',
    }),
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
        tableCaption={i18n.translate(
          'xpack.apm.serviceMap.diagnosticResults.highlightedExitSpansCaption',
          {
            defaultMessage: 'Highlighted exit spans',
          }
        )}
      />
    </EuiPanel>
  );
}
