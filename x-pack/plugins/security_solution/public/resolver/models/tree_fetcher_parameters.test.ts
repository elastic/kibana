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
    [
      { databaseDocumentID: 'a', indices: [], filters: {} },
      { databaseDocumentID: 'b', indices: [], filters: {} },
      false,
    ],
    // different indices length
    [
      { databaseDocumentID: 'a', indices: [''], filters: {} },
      { databaseDocumentID: 'a', indices: [], filters: {} },
      false,
    ],
    // same indices length, different databaseDocumentID
    [
      { databaseDocumentID: 'a', indices: [''], filters: {} },
      { databaseDocumentID: 'b', indices: [''], filters: {} },
      false,
    ],
    // 1 item in `indices`
    [
      { databaseDocumentID: 'b', indices: [''], filters: {} },
      { databaseDocumentID: 'b', indices: [''], filters: {} },
      true,
    ],
    // 2 item in `indices`
    [
      { databaseDocumentID: 'b', indices: ['1', '2'], filters: {} },
      { databaseDocumentID: 'b', indices: ['1', '2'], filters: {} },
      true,
    ],
    // 2 item in `indices`, but order inversed
    [
      { databaseDocumentID: 'b', indices: ['2', '1'], filters: {} },
      { databaseDocumentID: 'b', indices: ['1', '2'], filters: {} },
      true,
    ],
    // all parameters the same, except for the request id
    [
      { databaseDocumentID: 'b', indices: [], dataRequestID: 0, filters: {} },
      { databaseDocumentID: 'b', indices: [], dataRequestID: 1, filters: {} },
      false,
    ],
  ];
  describe.each(cases)('%p when compared to %p', (first, second, expected) => {
    it(`should ${expected ? '' : 'not'}be equal`, () => {
      expect(equal(first, second)).toBe(expected);
    });
  });
});
