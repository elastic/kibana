/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { isFinite, keyBy } from 'lodash';
import {
  EuiBasicTableColumn,
  EuiFlexGroup,
  EuiFlexItem,
  EuiInMemoryTable,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { EuiText } from '@elastic/eui';
import { TraceSearchState } from '../../../../../../common/trace_explorer/trace_data_search_state';
import {
  asMillisecondDuration,
  asPercent,
  asTransactionRate,
} from '../../../../../../common/utils/formatters';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { TraceOperationsResponse } from '../../../../../../server/lib/trace_explorer/trace_operations_fetcher';
import { UseTraceQueryState } from '../../../../../hooks/use_trace_query';
import { SpanIcon } from '../../../../shared/span_icon';

function ComparisonStat({
  sourceStat,
  sourceLabel,
  targetStat,
}: {
  sourceStat: number | undefined;
  sourceLabel: string;
  targetStat: number | undefined;
}) {
  const diff =
    targetStat !== undefined && sourceStat !== undefined
      ? 1 - targetStat / sourceStat
      : null;

  const diffLabel = isFinite(diff) ? asPercent(diff, 1) : undefined;

  return (
    <EuiFlexGroup direction="column" gutterSize="s">
      <EuiFlexItem>
        <EuiText size="m">{sourceLabel}</EuiText>
      </EuiFlexItem>
      {diffLabel ? <EuiFlexItem>{diffLabel}</EuiFlexItem> : null}
    </EuiFlexGroup>
  );
}

function TraceOperationsTable({
  queryState,
  compareToQueryState,
}: {
  queryState?: TraceSearchState;
  compareToQueryState?: TraceSearchState;
}) {
  const items = queryState?.fragments.operations.data ?? [];
  const compareToItemsById = keyBy(
    compareToQueryState?.fragments.operations.data ?? [],
    'id'
  );

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
            <EuiFlexItem style={{ whiteSpace: 'nowrap' }} grow>
              {spanName}
            </EuiFlexItem>
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
      render: (_, { totalLatency, count, id }) => {
        const avg = totalLatency / count;
        const targetStat = compareToItemsById[id]
          ? compareToItemsById[id].totalLatency / compareToItemsById[id].count
          : undefined;

        return (
          <ComparisonStat
            sourceStat={avg}
            targetStat={targetStat}
            sourceLabel={asMillisecondDuration(avg)}
          />
        );
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
      render: (_, { count, id }) => {
        return (
          <ComparisonStat
            sourceStat={count}
            targetStat={compareToItemsById[id]?.count}
            sourceLabel={asTransactionRate(count)}
          />
        );
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
      items={items}
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
        <TraceOperationsTable
          queryState={foreground.traceSearchState}
          compareToQueryState={background.traceSearchState}
        />
      </EuiFlexItem>
      {background && background.traceSearchState ? (
        <EuiFlexItem grow={1}>
          <TraceOperationsTable
            queryState={background.traceSearchState}
            compareToQueryState={foreground.traceSearchState}
          />
        </EuiFlexItem>
      ) : null}
    </EuiFlexGroup>
  );
}
