/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TreeFetcherParameters } from '../types';

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
    // all parameters the same, except for the filters
    [
      { databaseDocumentID: 'b', indices: [], filters: {} },
      {
        databaseDocumentID: 'b',
        indices: [],
        filters: { to: 'to', from: 'from' },
      },
      false,
    ],
    // all parameters the same, except for the filters.to
    [
      { databaseDocumentID: 'b', indices: [], filters: { to: '100' } },
      {
        databaseDocumentID: 'b',
        indices: [],
        filters: { to: 'to' },
      },
      false,
    ],
    // all parameters the same, except for the filters.to, parameters are swapped from the one above
    [
      {
        databaseDocumentID: 'b',
        indices: [],
        filters: { to: 'to' },
      },
      { databaseDocumentID: 'b', indices: [], filters: { to: '100' } },
      false,
    ],
    // all parameters the same
    [
      {
        databaseDocumentID: 'b',
        indices: [],
        filters: { to: 'to', from: 'from' },
      },
      {
        databaseDocumentID: 'b',
        indices: [],
        filters: { to: 'to', from: 'from' },
      },
      true,
    ],
    // all parameters the same, only using the filters.to field
    [
      {
        databaseDocumentID: 'b',
        indices: [],
        filters: { to: 'to' },
      },
      {
        databaseDocumentID: 'b',
        indices: [],
        filters: { to: 'to' },
      },
      true,
    ],
  ];
  describe.each(cases)('%p when compared to %p', (first, second, expected) => {
    it(`should ${expected ? '' : 'not'}be equal`, () => {
      expect(equal(first, second)).toBe(expected);
    });
  });
});
