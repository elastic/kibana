/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SerializableRecord } from '@kbn/utility-types';
import { functionWrapper } from '@kbn/presentation-util-plugin/common/lib';
import { getFunctionErrors } from '../../../i18n';
import { csv } from './csv';
import { Datatable, ExecutionContext } from '@kbn/expressions-plugin';
import { Adapters } from '@kbn/inspector-plugin';

const errors = getFunctionErrors().csv;

describe('csv', () => {
  const fn = functionWrapper(csv);

  const expected: Datatable = {
    type: 'datatable',
    columns: [
      { id: 'name', name: 'name', meta: { type: 'string' } },
      { id: 'number', name: 'number', meta: { type: 'string' } },
    ],
    rows: [
      { name: 'one', number: '1' },
      { name: 'two', number: '2' },
      { name: 'fourty two', number: '42' },
    ],
  };

  it('should return a datatable', () => {
    expect(
      fn(
        null,
        {
          data: `name,number
one,1
two,2
fourty two,42`,
        },
        {} as ExecutionContext<Adapters, SerializableRecord>
      )
    ).toEqual(expected);
  });

  it('should allow custom delimiter', () => {
    expect(
      fn(
        null,
        {
          data: `name\tnumber
one\t1
two\t2
fourty two\t42`,
          delimiter: '\t',
        },
        {} as ExecutionContext<Adapters, SerializableRecord>
      )
    ).toEqual(expected);

    expect(
      fn(
        null,
        {
          data: `name%SPLIT%number
one%SPLIT%1
two%SPLIT%2
fourty two%SPLIT%42`,
          delimiter: '%SPLIT%',
        },
        {} as ExecutionContext<Adapters, SerializableRecord>
      )
    ).toEqual(expected);
  });

  it('should allow custom newline', () => {
    expect(
      fn(
        null,
        {
          data: `name,number\rone,1\rtwo,2\rfourty two,42`,
          newline: '\r',
        },
        {} as ExecutionContext<Adapters, SerializableRecord>
      )
    ).toEqual(expected);
  });

  it('should trim column names', () => {
    const expectedResult: Datatable = {
      type: 'datatable',
      columns: [
        { id: 'foo', name: 'foo', meta: { type: 'string' } },
        { id: 'bar', name: 'bar', meta: { type: 'string' } },
        { id: 'baz', name: 'baz', meta: { type: 'string' } },
        { id: 'buz', name: 'buz', meta: { type: 'string' } },
      ],
      rows: [{ foo: '1', bar: '2', baz: '3', buz: '4' }],
    };

    expect(
      fn(
        null,
        {
          data: `foo," bar  ", baz, " buz "
1,2,3,4`,
        },
        {} as ExecutionContext<Adapters, SerializableRecord>
      )
    ).toEqual(expectedResult);
  });

  it('should handle odd spaces correctly', () => {
    const expectedResult: Datatable = {
      type: 'datatable',
      columns: [
        { id: 'foo', name: 'foo', meta: { type: 'string' } },
        { id: 'bar', name: 'bar', meta: { type: 'string' } },
        { id: 'baz', name: 'baz', meta: { type: 'string' } },
        { id: 'buz', name: 'buz', meta: { type: 'string' } },
      ],
      rows: [
        { foo: '1', bar: '  best  ', baz: '3', buz: '  ok' },
        { foo: '  good', bar: ' bad', baz: ' better   ', buz: ' worst    ' },
      ],
    };

    expect(
      fn(
        null,
        {
          data: `foo," bar  ", baz, " buz "
1,"  best  ",3, "  ok"
"  good", bad, better   , " worst    " `,
        },
        {} as ExecutionContext<Adapters, SerializableRecord>
      )
    ).toEqual(expectedResult);
  });

  it('throws when given invalid csv', () => {
    expect(() => {
      fn(
        null,
        {
          data: `name,number
one|1
two.2
fourty two,42`,
        },
        {} as ExecutionContext<Adapters, SerializableRecord>
      );
    }).toThrow(new RegExp(errors.invalidInputCSV().message));
  });
});
