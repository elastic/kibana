/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Datatable, ExecutionContext } from '@kbn/expressions-plugin/common';
import { functionWrapper } from '@kbn/expressions-plugin/common/expression_functions/specs/tests/utils';
import { CollapseArgs, collapse } from '.';

describe('collapse_fn', () => {
  const fn = functionWrapper(collapse);
  const runFn = (input: Datatable, args: CollapseArgs) =>
    fn(input, args, {} as ExecutionContext) as Promise<Datatable>;

  it('collapses all rows', async () => {
    const result = await runFn(
      {
        type: 'datatable',
        columns: [
          { id: 'val', name: 'val', meta: { type: 'number' } },
          { id: 'split', name: 'split', meta: { type: 'string' } },
        ],
        rows: [
          { val: 1, split: 'A' },
          { val: 2, split: 'B' },
          { val: 3, split: 'B' },
          { val: 4, split: 'A' },
          { val: 5, split: 'A' },
          { val: 6, split: 'A' },
          { val: 7, split: 'B' },
          { val: 8, split: 'B' },
        ],
      },
      { metric: ['val'], fn: 'sum' }
    );

    expect(result.rows).toEqual([{ val: 1 + 2 + 3 + 4 + 5 + 6 + 7 + 8 }]);
  });

  const twoSplitTable: Datatable = {
    type: 'datatable',
    columns: [
      { id: 'val', name: 'val', meta: { type: 'number' } },
      { id: 'split', name: 'split', meta: { type: 'string' } },
      { id: 'split2', name: 'split2', meta: { type: 'string' } },
    ],
    rows: [
      { val: 1, split: 'A', split2: 'C' },
      { val: 2, split: 'B', split2: 'C' },
      { val: 3, split2: 'C' },
      { val: 4, split: 'A', split2: 'C' },
      { val: 5 },
      { val: 6, split: 'A', split2: 'D' },
      { val: 7, split: 'B', split2: 'D' },
      { val: 8, split: 'B', split2: 'D' },
    ],
  };

  it('splits by a column', async () => {
    const result = await runFn(twoSplitTable, { metric: ['val'], by: ['split'], fn: 'sum' });
    expect(result.rows).toEqual([
      { val: 1 + 4 + 6, split: 'A' },
      { val: 2 + 7 + 8, split: 'B' },
      { val: 3 + 5, split: undefined },
    ]);
  });

  it('applies avg', async () => {
    const result = await runFn(twoSplitTable, { metric: ['val'], by: ['split'], fn: 'avg' });
    expect(result.rows).toEqual([
      { val: (1 + 4 + 6) / 3, split: 'A' },
      { val: (2 + 7 + 8) / 3, split: 'B' },
      { val: (3 + 5) / 2, split: undefined },
    ]);
  });

  it('applies min', async () => {
    const result = await runFn(twoSplitTable, { metric: ['val'], by: ['split'], fn: 'min' });
    expect(result.rows).toEqual([
      { val: 1, split: 'A' },
      { val: 2, split: 'B' },
      { val: 3, split: undefined },
    ]);
  });

  it('applies max', async () => {
    const result = await runFn(twoSplitTable, { metric: ['val'], by: ['split'], fn: 'max' });
    expect(result.rows).toEqual([
      { val: 6, split: 'A' },
      { val: 8, split: 'B' },
      { val: 5, split: undefined },
    ]);
  });
});
