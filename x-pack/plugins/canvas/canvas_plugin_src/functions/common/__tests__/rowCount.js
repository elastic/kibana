/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { rowCount } from '../rowCount';
import { functionWrapper } from '../../../../__tests__/helpers/function_wrapper';
import { emptyTable, testTable } from './fixtures/test_tables';

describe('rowCount', () => {
  const fn = functionWrapper(rowCount);

  it('returns the number of rows in the datatable', () => {
    expect(fn(testTable)).to.equal(testTable.rows.length);
    expect(fn(emptyTable)).to.equal(0);
  });
});
