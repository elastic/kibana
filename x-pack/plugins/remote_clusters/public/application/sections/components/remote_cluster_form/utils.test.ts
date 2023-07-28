/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { removeNullProperties } from './request_flyout';

describe('Remote cluster form Utils', () => {
  test('can remote deeply nested null properties from object', () => {
    const obj = {
      a: 'a',
      b: {
        c: 'c',
        d: null,
      },
    };

    expect(removeNullProperties(obj)).toStrictEqual({
      ...obj,
      b: {
        c: 'c',
      },
    });

    expect(removeNullProperties({ a: 'a', b: null })).toStrictEqual({ a: 'a' });
  });
});
