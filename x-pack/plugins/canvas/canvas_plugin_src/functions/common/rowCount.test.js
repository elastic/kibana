/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { functionWrapper } from '@kbn/presentation-util-plugin/common/lib';
import { emptyTable, testTable } from './__fixtures__/test_tables';
import { rowCount } from './rowCount';

describe('rowCount', () => {
  const fn = functionWrapper(rowCount);

  it('returns the number of rows in the datatable', () => {
    expect(fn(testTable)).toEqual(testTable.rows.length);
    expect(fn(emptyTable)).toEqual(0);
  });
});
