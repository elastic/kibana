/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DataViewField } from 'src/plugins/data/common';
import { stubIndexPattern, stubIndexPatternWithoutTimeField } from 'src/plugins/data/common/stubs';
import { getSort } from './get_sort';

const createMockIndexPattern = () => stubIndexPattern;
const createMockIndexPatternWithoutTimeField = () => stubIndexPatternWithoutTimeField;

describe('get_sort', () => {
  it('gets the sort for @timestamp', () => {
    const mockIndexPattern = createMockIndexPattern();
    mockIndexPattern.getFieldByName = jest.fn((fieldName) => {
      if (fieldName === '@timestamp') {
        return { sortable: true } as DataViewField;
      }
    });
    const sortPair: [string, string] = ['sortField', 'desc'];

    const result = getSort(sortPair, mockIndexPattern);
    expect(result).toMatchInlineSnapshot(`
      Array [
        Object {
          "sortField": "desc",
        },
      ]
    `);
  });

  it('gets complex sort', () => {
    const mockIndexPattern = createMockIndexPatternWithoutTimeField();
    mockIndexPattern.getFieldByName = jest.fn(() => {
      return {
        sortable: true,
      } as DataViewField;
    });
    const sortPair: Array<[string, string]> = [
      ['eon', 'asc'],
      ['epoch', 'asc'],
      ['era', 'asc'],
      ['period', 'asc'],
    ];

    const result = getSort(sortPair, mockIndexPattern);
    expect(result).toMatchInlineSnapshot(`
      Array [
        Object {
          "eon": "asc",
        },
        Object {
          "epoch": "asc",
        },
        Object {
          "era": "asc",
        },
        Object {
          "period": "asc",
        },
      ]
    `);
  });
});
