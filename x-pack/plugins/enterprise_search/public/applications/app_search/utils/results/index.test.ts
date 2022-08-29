/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { formatResult } from '.';

describe('formatResult', () => {
  it('format the result', () => {
    const data = {
      id: { raw: 'doc-id' },
      text_field: { raw: 'text value' },
      numeric_field: { raw: 21 },
      multivalued_field: { raw: ['value_1', 'value_2'] },
      'simple_object.flattened': { raw: ['value_1', 'value_2'] },
      raw: { raw: 'raw_value' },
      snippet: { snippet: 'snipet_value' },
    };

    expect(formatResult(data)).toEqual(data);
  });

  describe('with nested objects', () => {
    describe('single value field', () => {
      it('transform nested field values', () => {
        expect(
          formatResult({
            id: { raw: 'doc-id' },
            nested_object: {
              subfield_1: { raw: ['value 1', 'value 2'] },
              subfield_2: { raw: 'value 3' },
            },
          })
        ).toEqual({
          id: { raw: 'doc-id' },
          nested_object: {
            raw: {
              subfield_1: ['value 1', 'value 2'],
              subfield_2: 'value 3',
            },
          },
        });
      });
    });

    describe('multi-valued field', () => {
      it('transform nested field values', () => {
        expect(
          formatResult({
            id: { raw: 'doc-id' },
            nested_object: [
              {
                subfield_1: { raw: ['value 1', 'value 2'] },
                subfield_2: { raw: 'value 3' },
                raw: { raw: 'raw_value' },
                snippet: { raw: 'snippert_value' },
              },
              {
                subfield_1: { raw: 'value 4' },
                raw: { raw: ['raw_value'] },
                snippet: { raw: ['snippert_value'] },
              },
            ],
          })
        ).toEqual({
          id: { raw: 'doc-id' },
          nested_object: {
            raw: [
              {
                subfield_1: ['value 1', 'value 2'],
                subfield_2: 'value 3',
                raw: 'raw_value',
                snippet: 'snippert_value',
              },
              {
                subfield_1: 'value 4',
                raw: ['raw_value'],
                snippet: ['snippert_value'],
              },
            ],
          },
        });
      });
    });
  });

  it('does not consider _meta field as a nested field', () => {
    const data = {
      id: { raw: 'doc-id' },
      _meta: { id: '1', _score: 12, engine: 'foo-engine' },
    };
    expect(formatResult(data)).toEqual(data);
  });
});
