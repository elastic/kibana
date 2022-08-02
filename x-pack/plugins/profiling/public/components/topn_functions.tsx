/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useContext, useMemo } from 'react';
import { i18n } from '@kbn/i18n';

import {
  EuiBasicTable,
  EuiBasicTableColumn,
  EuiHorizontalRule,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';

import { orderBy } from 'lodash';
import { getCalleeFunction, getCalleeSource, StackFrameMetadata } from '../../common/profiling';
import { FunctionContext } from './contexts/function';
import { TopNFunctionSortField } from '../../common/functions';

interface Row {
  rank: number;
  frame: StackFrameMetadata;
  samples: number;
  exclusiveCPU: number;
  inclusiveCPU: number;
}

export const TopNFunctionsTable = ({
  sortDirection,
  sortField,
  onSortChange,
}: {
  sortDirection: 'asc' | 'desc';
  sortField: TopNFunctionSortField;
  onSortChange: (options: {
    sortDirection: 'asc' | 'desc';
    sortField: TopNFunctionSortField;
  }) => void;
}) => {
  const ctx = useContext(FunctionContext);

  const totalCount: number = useMemo(() => {
    if (!ctx || !ctx.TotalCount || ctx.TotalCount === 0) {
      return 0;
    }

    return ctx.TotalCount;
  }, [ctx]);

  const rows: Row[] = useMemo(() => {
    if (!ctx || !ctx.TotalCount || ctx.TotalCount === 0) {
      return [];
    }

    return ctx.TopN.filter((topN) => topN.CountExclusive > 0).map((topN, i) => ({
      rank: i + 1,
      frame: topN.Frame,
      samples: topN.CountExclusive,
      exclusiveCPU: (topN.CountExclusive / ctx.TotalCount) * 100,
      inclusiveCPU: (topN.CountInclusive / ctx.TotalCount) * 100,
    }));
  }, [ctx]);

  const columns: Array<EuiBasicTableColumn<Row>> = [
    {
      field: TopNFunctionSortField.Rank,
      name: i18n.translate('xpack.profiling.functionsView.rankColumnLabel', {
        defaultMessage: 'Rank',
      }),
    },
    {
      field: TopNFunctionSortField.Frame,
      name: i18n.translate('xpack.profiling.functionsView.functionColumnLabel', {
        defaultMessage: 'Function',
      }),
      width: '100%',
      render: (_, { frame }) => (
        <EuiText size="s">
          <strong>{getCalleeFunction(frame)}</strong>
          <p>{getCalleeSource(frame)}</p>
        </EuiText>
      ),
    },
    {
      field: TopNFunctionSortField.Samples,
      name: i18n.translate('xpack.profiling.functionsView.samplesColumnLabel', {
        defaultMessage: 'Samples',
      }),
    },
    {
      field: TopNFunctionSortField.ExclusiveCPU,
      name: i18n.translate('xpack.profiling.functionsView.exclusiveCpuColumnLabel', {
        defaultMessage: 'Exclusive CPU',
      }),
      render: (_, { exclusiveCPU }) => `${exclusiveCPU.toFixed(2)}%`,
    },
    {
      field: TopNFunctionSortField.InclusiveCPU,
      name: i18n.translate('xpack.profiling.functionsView.inclusiveCpuColumnLabel', {
        defaultMessage: 'Inclusive CPU',
      }),
      render: (_, { inclusiveCPU }) => `${inclusiveCPU.toFixed(2)}%`,
    },
  ];

  const totalSampleCountLabel = i18n.translate(
    'xpack.profiling.functionsView.totalSampleCountLabel',
    {
      defaultMessage: 'Total sample count',
    }
  );

  const sortedRows = orderBy(
    rows,
    (row) => {
      return sortField === TopNFunctionSortField.Frame
        ? getCalleeFunction(row.frame).toLowerCase()
        : row[sortField];
    },
    [sortDirection]
  );

  return (
    <>
      <EuiText size="xs">
        <strong>{totalSampleCountLabel}:</strong> {totalCount}
      </EuiText>
      <EuiSpacer size="s" />
      <EuiHorizontalRule margin="none" style={{ height: 2 }} />
      <EuiBasicTable
        items={sortedRows}
        columns={columns}
        tableLayout="auto"
        onChange={(criteria) => {
          onSortChange({
            sortDirection: criteria.sort!.direction,
            sortField: criteria.sort!.field as TopNFunctionSortField,
          });
        }}
        sorting={{
          enableAllColumns: true,
          sort: {
            direction: sortDirection,
            field: sortField,
          },
        }}
      />
    </>
  );
};
