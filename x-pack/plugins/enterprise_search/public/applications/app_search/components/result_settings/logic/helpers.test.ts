/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { clearAllServerFields, clearAllFields } from './helpers';

describe('clearAllFields', () => {
  it('will reset every key in an object back to an empty object', () => {
    expect(
      clearAllFields({
        foo: { raw: false, snippet: false, snippetFallback: false },
        bar: { raw: true, snippet: false, snippetFallback: true },
      })
    ).toEqual({
      foo: {},
      bar: {},
    });
  });
});

describe('clearAllServerFields', () => {
  it('will reset every key in an object back to an empty object', () => {
    expect(
      clearAllServerFields({
        foo: { raw: { size: 5 } },
        bar: { raw: true },
      })
    ).toEqual({
      foo: {},
      bar: {},
    });
  });
});
