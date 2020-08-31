/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { functionWrapper } from '../../../__tests__/helpers/function_wrapper';
import { emptyTable, testTable } from './__tests__/fixtures/test_tables';
import { rowCount } from './rowCount';

describe('rowCount', () => {
  const fn = functionWrapper(rowCount);

  it('returns the number of rows in the datatable', () => {
    expect(fn(testTable)).toEqual(testTable.rows.length);
    expect(fn(emptyTable)).toEqual(0);
  });
});
