/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { filterrows } from '../filterrows';
import { functionWrapper } from '../../../../__tests__/helpers/function_wrapper';
import { testTable } from './fixtures/test_tables';

const inStock = datatable => datatable.rows[0].in_stock;
const returnFalse = () => false;

describe('filterrows', () => {
  const fn = functionWrapper(filterrows);

  it('returns a datable', () => {
    return fn(testTable, { fn: inStock }).then(result => {
      expect(result).to.have.property('type', 'datatable');
    });
  });

  it('keeps rows that evaluate to true and removes rows that evaluate to false', () => {
    const inStockRows = testTable.rows.filter(row => row.in_stock);

    return fn(testTable, { fn: inStock }).then(result => {
      expect(result.columns).to.eql(testTable.columns);
      expect(result.rows).to.eql(inStockRows);
    });
  });

  it('returns datatable with no rows when no rows meet function condition', () => {
    return fn(testTable, { fn: returnFalse }).then(result => {
      expect(result.rows).to.be.empty();
    });
  });

  it('throws when no function is provided', () => {
    expect(() => fn(testTable)).to.throwException(e => {
      expect(e.message).to.be('fn is not a function');
    });
  });
});
