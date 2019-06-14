/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { joinRows } from '../joinRows';
import { functionWrapper } from '../../../../__tests__/helpers/function_wrapper';
import { getFunctionErrors } from '../../../strings/functions';
import { testTable } from './fixtures/test_tables';

const errors = getFunctionErrors().getCell;

describe('joinRows', () => {
  const fn = functionWrapper(joinRows);

  const joesTable = {
    type: 'datatable',
    columns: [
      {
        name: 'name',
        type: 'string',
      },
    ],
    rows: [
      {
        name: "joe's product",
      },
    ],
  };

  const emptyTable = {
    type: 'datatable',
    columns: [
      {
        name: 'name',
        type: 'string',
      },
    ],
    rows: [],
  };

  it('returns a string from rows joined with sparator and quote, and remove duplicates', () => {
    expect(fn(testTable, { column: 'name', quote: `'` })).to.be(
      "'product1','product2','product3','product4','product5'"
    );
  });

  it('escapes names with quote character in them', () => {
    expect(fn(joesTable, { column: 'name', quote: `'` })).to.be("'joe\\'s product'");
  });

  it('does not escape if no quote character is given', () => {
    expect(fn(joesTable, { column: 'name', quote: '' })).to.be("joe's product");
  });

  it('returns a string from rows joined with sparator without quote, and remove duplicates', () => {
    expect(fn(testTable, { column: 'name', quote: '' })).to.be(
      'product1,product2,product3,product4,product5'
    );
  });

  it('does not remove duplicates if distinct is false', () => {
    expect(fn(testTable, { column: 'name', quote: '', distinct: false })).to.be(
      'product1,product1,product1,product2,product2,product2,product3,product4,product5'
    );
  });

  it('throws when invalid column is provided', () => {
    expect(() => fn(testTable, { column: 'foo' })).to.throwException(
      new RegExp(errors.columnNotFound('foo').message)
    );
  });

  it('empty table returns empty string', () => {
    expect(fn(emptyTable, { column: 'name' })).to.be('');
  });
});
