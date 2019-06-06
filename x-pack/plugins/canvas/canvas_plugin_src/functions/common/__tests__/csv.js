/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { csv } from '../csv';
import { functionWrapper } from '../../../../__tests__/helpers/function_wrapper';
import { getFunctionErrors } from '../../../strings';

const errors = getFunctionErrors().csv;

describe('csv', () => {
  const fn = functionWrapper(csv);
  const expected = {
    type: 'datatable',
    columns: [{ name: 'name', type: 'string' }, { name: 'number', type: 'string' }],
    rows: [
      { name: 'one', number: 1 },
      { name: 'two', number: 2 },
      { name: 'fourty two', number: 42 },
    ],
  };

  it('should return a datatable', () => {
    expect(
      fn(null, {
        data: `name,number
one,1
two,2
fourty two,42`,
      })
    ).to.eql(expected);
  });

  it('should allow custom delimiter', () => {
    expect(
      fn(null, {
        data: `name\tnumber
one\t1
two\t2
fourty two\t42`,
        delimiter: '\t',
      })
    ).to.eql(expected);

    expect(
      fn(null, {
        data: `name%SPLIT%number
one%SPLIT%1
two%SPLIT%2
fourty two%SPLIT%42`,
        delimiter: '%SPLIT%',
      })
    ).to.eql(expected);
  });

  it('should allow custom newline', () => {
    expect(
      fn(null, {
        data: `name,number\rone,1\rtwo,2\rfourty two,42`,
        newline: '\r',
      })
    ).to.eql(expected);
  });

  it('should trim column names', () => {
    expect(
      fn(null, {
        data: `foo," bar  ", baz, " buz "
1,2,3,4`,
      })
    ).to.eql({
      type: 'datatable',
      columns: [
        { name: 'foo', type: 'string' },
        { name: 'bar', type: 'string' },
        { name: 'baz', type: 'string' },
        { name: 'buz', type: 'string' },
      ],
      rows: [{ foo: '1', bar: '2', baz: '3', buz: '4' }],
    });
  });

  it('should handle odd spaces correctly', () => {
    expect(
      fn(null, {
        data: `foo," bar  ", baz, " buz "
1,"  best  ",3, "  ok"
"  good", bad, better   , " worst    " `,
      })
    ).to.eql({
      type: 'datatable',
      columns: [
        { name: 'foo', type: 'string' },
        { name: 'bar', type: 'string' },
        { name: 'baz', type: 'string' },
        { name: 'buz', type: 'string' },
      ],
      rows: [
        { foo: '1', bar: '  best  ', baz: '3', buz: '  ok' },
        { foo: '  good', bar: ' bad', baz: ' better   ', buz: ' worst    ' },
      ],
    });
  });

  it('throws when given invalid csv', () => {
    expect(fn)
      .withArgs(null, {
        data: `name,number
one|1
two.2
fourty two,42`,
      })
      .to.throwException(new RegExp(errors.invalidInputCSV().message));
  });
});
