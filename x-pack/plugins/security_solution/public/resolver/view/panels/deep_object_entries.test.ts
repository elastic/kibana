/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { deepObjectEntries } from './deep_object_entries';

describe('deepObjectEntries', () => {
  const valuesAndExpected: Array<
    [
      objectValue: object,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expected: Array<[path: Array<keyof any>, fieldValue: unknown]>
    ]
  > = [
    [{}, []], // No 'field' values found
    [{ a: {} }, []], // No 'field' values found
    [{ a: { b: undefined } }, []], // No 'field' values found
    [{ a: { b: undefined, c: [] } }, []], // No 'field' values found
    [{ a: { b: undefined, c: [null] } }, []], // No 'field' values found
    [{ a: { b: undefined, c: [null, undefined, 1] } }, [[['a', 'c'], 1]]], // Only `1` is a non-null value. It is under `a.c` because we ignore array indices
    [
      { a: { b: undefined, c: [null, undefined, 1, { d: ['e'] }] } },
      [
        // 1 and 'e' are valid fields.
        [['a', 'c'], 1],
        [['a', 'c', 'd'], 'e'],
      ],
    ],
  ];

  describe.each(valuesAndExpected)('when passed %j', (value, expected) => {
    it(`should return ${JSON.stringify(expected)}`, () => {
      expect(deepObjectEntries(value)).toEqual(expected);
    });
  });
});
