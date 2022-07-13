/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { convertToResultFormat, convertIdToMeta } from './utils';

describe('convertToResultFormat', () => {
  it('converts curation results to a format that the Result component can use', () => {
    expect(
      convertToResultFormat({
        id: 'some-id',
        someField: 'some flat string',
        anotherField: '123456',
      })
    ).toEqual({
      _meta: {
        id: 'some-id',
      },
      id: {
        raw: 'some-id',
      },
      someField: {
        raw: 'some flat string',
      },
      anotherField: {
        raw: '123456',
      },
    });
  });
});

describe('convertIdToMeta', () => {
  it('creates an approximate _meta object based on the curation result ID', () => {
    expect(convertIdToMeta('some-id')).toEqual({ id: 'some-id' });
    expect(convertIdToMeta('some-engine|some-id')).toEqual({
      id: 'some-id',
      engine: 'some-engine',
    });
  });
});
