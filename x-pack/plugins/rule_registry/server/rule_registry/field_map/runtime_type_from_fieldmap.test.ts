/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { runtimeTypeFromFieldMap } from './runtime_type_from_fieldmap';

describe('runtimeTypeFromFieldMap', () => {
  const fieldmapRt = runtimeTypeFromFieldMap({
    keywordField: { type: 'keyword' },
    longField: { type: 'long' },
    requiredKeywordField: { type: 'keyword', required: true },
    multiKeywordField: { type: 'keyword', array: true },
  } as const);

  it('accepts both singular and array fields', () => {
    expect(
      fieldmapRt.is({
        requiredKeywordField: 'keyword',
      })
    ).toBe(true);

    expect(
      fieldmapRt.is({
        requiredKeywordField: ['keyword'],
      })
    ).toBe(true);

    expect(
      fieldmapRt.is({
        requiredKeywordField: ['keyword'],
        multiKeywordField: 'keyword',
      })
    ).toBe(true);

    expect(
      fieldmapRt.is({
        requiredKeywordField: ['keyword'],
        multiKeywordField: ['keyword'],
      })
    ).toBe(true);
  });

  it('fails on invalid data types', () => {
    expect(
      fieldmapRt.is({
        requiredKeywordField: 2,
      })
    ).toBe(false);

    expect(
      fieldmapRt.is({
        requiredKeywordField: [2],
      })
    ).toBe(false);

    expect(
      fieldmapRt.is({
        requiredKeywordField: ['keyword'],
        longField: ['keyword'],
      })
    ).toBe(false);

    expect(
      fieldmapRt.is({
        requiredKeywordField: ['keyword'],
        longField: [3],
      })
    ).toBe(true);

    expect(
      fieldmapRt.is({
        requiredKeywordField: ['keyword'],
        longField: 3,
      })
    ).toBe(true);
  });

  it('outputs to single or array values', () => {
    expect(
      fieldmapRt.encode({
        requiredKeywordField: ['required'],
        keywordField: 'keyword',
        longField: [3, 2],
        multiKeywordField: ['keyword', 'foo'],
      })
    ).toEqual({
      requiredKeywordField: 'required',
      keywordField: 'keyword',
      longField: 3,
      multiKeywordField: ['keyword', 'foo'],
    });
  });
});
