/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SchemaType } from '../../../shared/schema/types';

import {
  areFieldsAtDefaultSettings,
  convertServerResultFieldsToResultFields,
  convertToServerFieldResultSetting,
  clearAllFields,
  resetAllFields,
  splitResultFields,
  areFieldsEmpty,
} from './utils';

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

describe('convertServerResultFieldsToResultFields', () => {
  it('will convert a server settings object to a format that the front-end expects', () => {
    expect(
      convertServerResultFieldsToResultFields(
        {
          foo: {
            raw: { size: 5 },
            snippet: { size: 3, fallback: true },
          },
        },
        {
          foo: { type: SchemaType.Text, capabilities: {} },
        }
      )
    ).toEqual({
      foo: {
        raw: true,
        rawSize: 5,
        snippet: true,
        snippetFallback: true,
        snippetSize: 3,
      },
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

describe('splitResultFields', () => {
  it('will split results based on their schema type', () => {
    expect(
      splitResultFields(
        {
          foo: {
            raw: true,
            rawSize: 5,
            snippet: false,
            snippetFallback: false,
          },
          bar: {
            raw: true,
            rawSize: 5,
            snippet: false,
            snippetFallback: false,
          },
        },
        {
          foo: { type: SchemaType.Text, capabilities: {} },
          bar: { type: SchemaType.Number, capabilities: {} },
          nested_object: { type: SchemaType.Nested, capabilities: {} },
        }
      )
    ).toEqual({
      nonTextResultFields: {
        bar: { raw: true, rawSize: 5, snippet: false, snippetFallback: false },
      },
      textResultFields: { foo: { raw: true, rawSize: 5, snippet: false, snippetFallback: false } },
    });
  });
});

describe('areFieldsEmpty', () => {
  it('should return true if all fields are empty or have all properties disabled', () => {
    expect(
      areFieldsEmpty({
        foo: {},
        bar: { raw: false, snippet: false },
        baz: { raw: false },
      })
    ).toBe(true);
  });

  it('should return false otherwise', () => {
    expect(
      areFieldsEmpty({
        foo: {
          raw: true,
          rawSize: 5,
          snippet: false,
          snippetFallback: false,
        },
        bar: {
          raw: true,
          rawSize: 5,
          snippet: false,
          snippetFallback: false,
        },
      })
    ).toBe(false);
  });
});

describe('areFieldsAtDefaultSettings', () => {
  it('will return true if all settings for all fields are at their defaults', () => {
    expect(
      areFieldsAtDefaultSettings({
        foo: {
          raw: true,
          snippet: false,
          snippetFallback: false,
        },
        bar: {
          raw: true,
          snippet: false,
          snippetFallback: false,
        },
      })
    ).toEqual(true);
  });

  it('will return false otherwise', () => {
    expect(
      areFieldsAtDefaultSettings({
        foo: {
          raw: true,
          snippet: false,
          snippetFallback: false,
        },
        bar: {
          raw: false,
          snippet: true,
          snippetFallback: true,
        },
      })
    ).toEqual(false);
  });
});
