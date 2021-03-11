/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  convertToServerFieldResultSetting,
  clearAllServerFields,
  clearAllFields,
  resetAllServerFields,
  resetAllFields,
} from './helpers';

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

describe('resetAllFields', () => {
  it('will reset every key in an object back to a default object', () => {
    expect(
      resetAllFields({
        foo: { raw: false, snippet: true, snippetFallback: true },
        bar: { raw: false, snippet: true, snippetFallback: true },
      })
    ).toEqual({
      foo: { raw: true, snippet: false, snippetFallback: false },
      bar: { raw: true, snippet: false, snippetFallback: false },
    });
  });
});

describe('resetAllServerFields', () => {
  it('will reset every key in an object back to a default object', () => {
    expect(
      resetAllServerFields({
        foo: { raw: { size: 5 } },
        bar: { snippet: true },
      })
    ).toEqual({
      foo: { raw: {} },
      bar: { raw: {} },
    });
  });
});

describe('convertToServerFieldResultSetting', () => {
  it('will convert a settings object to a format that the server expects', () => {
    expect(
      convertToServerFieldResultSetting({
        raw: true,
        rawSize: 5,
        snippet: true,
        snippetFallback: true,
        snippetSize: 3,
      })
    ).toEqual({
      raw: { size: 5 },
      snippet: { size: 3, fallback: true },
    });
  });

  it('will not include snippet or raw information if they are set to false', () => {
    expect(
      convertToServerFieldResultSetting({
        raw: false,
        rawSize: 5,
        snippet: false,
        snippetFallback: true,
        snippetSize: 3,
      })
    ).toEqual({});
  });

  it('will not include sizes if they are not included, or fallback if it is false', () => {
    expect(
      convertToServerFieldResultSetting({
        raw: true,
        snippet: true,
        snippetFallback: false,
      })
    ).toEqual({
      raw: {},
      snippet: {},
    });
  });
});
