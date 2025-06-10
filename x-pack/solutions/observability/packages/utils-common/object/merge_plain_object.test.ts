/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { mergePlainObjects } from './merge_plain_objects';

describe('mergePlainObjects', () => {
  it('recursively merges plain objects', () => {
    expect(
      mergePlainObjects({}, { foo: { bar: 'baz' } }, { foo: { baz: 'rab', bar: 'baz' } })
    ).toEqual({
      foo: {
        bar: 'baz',
        baz: 'rab',
      },
    });
  });

  it('overrides arrays', () => {
    expect(mergePlainObjects({ myArray: [0, 1, 2, 3] }, { myArray: [4, 5, 6] })).toEqual({
      myArray: [4, 5, 6],
    });
  });

  it('overrides all primitives', () => {
    expect(
      mergePlainObjects(
        { number: 'number', boolean: 'boolean', string: 'string', null: null },
        { number: 'num', boolean: 'bool', string: 'str' }
      )
    ).toEqual({
      number: 'num',
      boolean: 'bool',
      string: 'str',
      null: null,
    });
  });
});
