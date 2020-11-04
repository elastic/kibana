/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { TreeFetcherParameters } from '../types';

import { equal } from './tree_fetcher_parameters';
describe('TreeFetcherParameters#equal:', () => {
  const cases: Array<[TreeFetcherParameters, TreeFetcherParameters, boolean]> = [
    // different databaseDocumentID
    [{ databaseDocumentID: 'a', indices: [] }, { databaseDocumentID: 'b', indices: [] }, false],
    // different indices length
    [{ databaseDocumentID: 'a', indices: [''] }, { databaseDocumentID: 'a', indices: [] }, false],
    // same indices length, different databaseDocumentID
    [{ databaseDocumentID: 'a', indices: [''] }, { databaseDocumentID: 'b', indices: [''] }, false],
    // 1 item in `indices`
    [{ databaseDocumentID: 'b', indices: [''] }, { databaseDocumentID: 'b', indices: [''] }, true],
    // 2 item in `indices`
    [
      { databaseDocumentID: 'b', indices: ['1', '2'] },
      { databaseDocumentID: 'b', indices: ['1', '2'] },
      true,
    ],
    // 2 item in `indices`, but order inversed
    [
      { databaseDocumentID: 'b', indices: ['2', '1'] },
      { databaseDocumentID: 'b', indices: ['1', '2'] },
      true,
    ],
  ];
  describe.each(cases)('%p when compared to %p', (first, second, expected) => {
    it(`should ${expected ? '' : 'not'}be equal`, () => {
      expect(equal(first, second)).toBe(expected);
    });
  });
});
