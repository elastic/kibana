/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useContext, useMemo } from 'react';
import { i18n } from '@kbn/i18n';

import { EuiBasicTable, EuiHorizontalRule, EuiSpacer, EuiText } from '@elastic/eui';

import { getCalleeFunction, getCalleeSource, StackFrameMetadata } from '../../common/profiling';
import { FunctionContext } from './contexts/function';

interface Row {
  rank: number;
  frame: StackFrameMetadata;
  samples: number;
  exclusiveCPU: number;
  inclusiveCPU: number;
}

export const TopNFunctionsTable = () => {
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

  const columns = [
    {
      field: 'rank',
      name: 'Rank',
    },
    {
      field: 'frame',
      name: 'Function',
      width: '50%',
      render: (f: StackFrameMetadata, row: Row) => (
        <EuiText size="s">
          <strong>{getCalleeFunction(f)}</strong>
          <p>{getCalleeSource(f)}</p>
        </EuiText>
      ),
    },
    {
      field: 'samples',
      name: 'Samples',
    },
    {
      field: 'exclusiveCPU',
      name: 'Exclusive CPU',
      render: (n: number, row: Row) => `${n.toFixed(2)}%`,
    },
    {
      field: 'inclusiveCPU',
      name: 'Inclusive CPU',
      render: (n: number, row: Row) => `${n.toFixed(2)}%`,
    },
  ];

  const totalSampleCountLabel = i18n.translate(
    'xpack.profiling.functionsView.totalSampleCountLabel',
    {
      defaultMessage: 'Total sample count',
    }
  );

  return (
    <>
      <EuiText size="xs">
        <strong>{totalSampleCountLabel}:</strong> {totalCount}
      </EuiText>
      <EuiSpacer size="s" />
      <EuiHorizontalRule margin="none" style={{ height: 2 }} />
      <EuiBasicTable items={rows} columns={columns} />
    </>
  );
};
