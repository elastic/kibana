/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { stubIndexPattern, stubIndexPatternWithoutTimeField } from 'src/plugins/data/common/stubs';
import { getSortForSearchSource } from './get_sort_for_search_source';

// copied from src/plugins/discover/public/application/apps/main/components/doc_table/lib/get_sort_for_search_source.test.ts
describe('getSortForSearchSource function', function () {
  test('should be a function', function () {
    expect(typeof getSortForSearchSource === 'function').toBeTruthy();
  });

  test('should return an object to use for searchSource when columns are given', function () {
    const cols: Array<[string, string]> = [['bytes', 'desc']];
    expect(getSortForSearchSource(cols, stubIndexPattern)).toEqual([{ bytes: 'desc' }]);
    expect(getSortForSearchSource(cols, stubIndexPattern, 'asc')).toEqual([{ bytes: 'desc' }]);

    expect(getSortForSearchSource(cols, stubIndexPatternWithoutTimeField)).toEqual([
      { bytes: 'desc' },
    ]);
    expect(getSortForSearchSource(cols, stubIndexPatternWithoutTimeField, 'asc')).toEqual([
      { bytes: 'desc' },
    ]);
  });

  test('should return an object to use for searchSource when no columns are given', function () {
    const cols: Array<[string, string]> = [];
    expect(getSortForSearchSource(cols, stubIndexPattern)).toEqual([{ _doc: 'desc' }]);
    expect(getSortForSearchSource(cols, stubIndexPattern, 'asc')).toEqual([{ _doc: 'asc' }]);

    expect(getSortForSearchSource(cols, stubIndexPatternWithoutTimeField)).toEqual([
      { _score: 'desc' },
    ]);
    expect(getSortForSearchSource(cols, stubIndexPatternWithoutTimeField, 'asc')).toEqual([
      { _score: 'asc' },
    ]);
  });
});
