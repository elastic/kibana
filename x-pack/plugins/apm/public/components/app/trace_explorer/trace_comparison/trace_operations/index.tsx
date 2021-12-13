/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  EuiBasicTableColumn,
  EuiFlexGroup,
  EuiFlexItem,
  EuiInMemoryTable,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { TraceSearchState } from '../../../../../../common/trace_explorer/trace_data_search_state';
import {
  asMillisecondDuration,
  asTransactionRate,
} from '../../../../../../common/utils/formatters';

import { TraceOperationsResponse } from '../../../../../../server/lib/trace_explorer/trace_operations_fetcher';
import { UseTraceQueryState } from '../../../../../hooks/use_trace_query';
import { SpanIcon } from '../../../../shared/span_icon';

function TraceOperationsTable({
  queryState,
}: {
  queryState?: TraceSearchState;
}) {
  const columns: Array<EuiBasicTableColumn<TraceOperationsResponse[number]>> = [
    {
      name: i18n.translate('xpack.apm.traceOperations.operationColumnTitle', {
        defaultMessage: 'Operation',
      }),
      field: 'spanName',
      width: '100%',
      render: (_, { spanType, spanSubtype, spanName }) => {
        return (
          <EuiFlexGroup
            direction="row"
            alignItems="flexStart"
            justifyContent="center"
            gutterSize="s"
          >
            <EuiFlexItem grow={false}>
              <SpanIcon type={spanType} subtype={spanSubtype} />
            </EuiFlexItem>
            <EuiFlexItem grow>{spanName}</EuiFlexItem>
          </EuiFlexGroup>
        );
      },
      sortable: (item) => item.spanName,
    },
    {
      name: i18n.translate('xpack.apm.traceOperations.avgDurationColumnTitle', {
        defaultMessage: 'Avg. duration',
      }),
      field: 'avgDuration',
      render: (_, { totalLatency, count }) => {
        const avg = totalLatency / count;
        return asMillisecondDuration(avg);
      },
      style: {
        whiteSpace: 'nowrap',
      },
      sortable: (item) => item.totalLatency / item.count,
    },
    {
      name: i18n.translate('xpack.apm.traceOperations.throughputColumnTitle', {
        defaultMessage: 'Throughput',
      }),
      field: 'throughput',
      render: (_, { count }) => {
        return asTransactionRate(count);
      },
      style: {
        whiteSpace: 'nowrap',
      },
      sortable: (item) => item.count,
    },
  ];
  return (
    <EuiInMemoryTable
      loading={queryState?.fragments.operations.isRunning === true}
      columns={columns}
      items={queryState?.fragments.operations.data ?? []}
      pagination
      sorting={{
        sort: {
          direction: 'desc',
          field: 'throughput',
        },
      }}
      tableLayout="auto"
    />
  );
}

export function TraceOperations({
  foreground,
  background,
}: {
  foreground: UseTraceQueryState;
  background: UseTraceQueryState;
}) {
  return (
    <EuiFlexGroup>
      <EuiFlexItem grow={1}>
        <TraceOperationsTable queryState={foreground.traceSearchState} />
      </EuiFlexItem>
      {background && background.traceSearchState ? (
        <EuiFlexItem grow={1}>
          <TraceOperationsTable queryState={background.traceSearchState} />
        </EuiFlexItem>
      ) : null}
    </EuiFlexGroup>
  );
}
