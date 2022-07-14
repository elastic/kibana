/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useContext, useMemo } from 'react';

import { EuiBasicTable } from '@elastic/eui';

import { FunctionContext } from './contexts/function';

export const TopNFunctionsTable = () => {
  const ctx = useContext(FunctionContext);

  const items = useMemo(() => {
    if (!ctx || !ctx.TotalCount || ctx.TotalCount === 0) {
      return [];
    }

    return ctx.TopN
      .filter((topN) => (topN.CountExclusive > 0))
      .map((topN, i) => ({
        rank: i + 1,
        function: topN.Frame.ExeFileName,
        samples: topN.CountExclusive,
        exclusiveCPU: topN.CountExclusive / ctx.TotalCount * 100,
        inclusiveCPU: topN.CountInclusive / ctx.TotalCount * 100,
      }));
  }, [ctx]);

  const columns = [
    {
      field: 'rank',
      name: 'Rank',
    },
    {
      field: 'function',
      name: 'Function',
    },
    {
      field: 'samples',
      name: 'Samples',
    },
    {
      field: 'exclusiveCPU',
      name: 'Exclusive CPU',
      render: (item) => `${Number(item).toFixed(2)}%`,
    },
    {
      field: 'inclusiveCPU',
      name: 'Inclusive CPU',
      render: (item) => `${Number(item).toFixed(2)}%`,
    },
  ];

  return (
    <>
      <EuiBasicTable items={items} columns={columns} />
    </>
  );
};
