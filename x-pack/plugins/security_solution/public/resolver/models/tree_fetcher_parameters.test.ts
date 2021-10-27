/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TreeFetcherParameters } from '../types';

import { equal } from './tree_fetcher_parameters';
describe('TreeFetcherParameters#equal:', () => {
  const cases: Array<[TreeFetcherParameters, TreeFetcherParameters, boolean]> = [
    // different databaseDocumentID
    [
      {
        originEventInfo: { databaseDocumentID: 'a', databaseDocumentIndex: 'indexA' },
        indices: [],
        filters: {},
      },
      {
        originEventInfo: { databaseDocumentID: 'b', databaseDocumentIndex: 'indexA' },
        indices: [],
        filters: {},
      },
      false,
    ],
    // different databaseDocumentIndex
    [
      {
        originEventInfo: { databaseDocumentID: 'a', databaseDocumentIndex: 'indexA' },
        indices: [],
        filters: {},
      },
      {
        originEventInfo: { databaseDocumentID: 'a', databaseDocumentIndex: 'indexB' },
        indices: [],
        filters: {},
      },
      false,
    ],
    // different indices length
    [
      {
        originEventInfo: { databaseDocumentID: 'a', databaseDocumentIndex: 'indexA' },
        indices: [''],
        filters: {},
      },
      {
        originEventInfo: { databaseDocumentID: 'a', databaseDocumentIndex: 'indexA' },
        indices: [],
        filters: {},
      },
      false,
    ],
    // same indices length, different databaseDocumentID
    [
      {
        originEventInfo: { databaseDocumentID: 'a', databaseDocumentIndex: 'indexA' },
        indices: [''],
        filters: {},
      },
      {
        originEventInfo: { databaseDocumentID: 'b', databaseDocumentIndex: 'indexA' },
        indices: [''],
        filters: {},
      },
      false,
    ],
    // 1 item in `indices`
    [
      {
        originEventInfo: { databaseDocumentID: 'b', databaseDocumentIndex: 'indexB' },
        indices: [''],
        filters: {},
      },
      {
        originEventInfo: { databaseDocumentID: 'b', databaseDocumentIndex: 'indexB' },
        indices: [''],
        filters: {},
      },
      true,
    ],
    // 2 item in `indices`
    [
      {
        originEventInfo: { databaseDocumentID: 'b', databaseDocumentIndex: 'indexB' },
        indices: ['1', '2'],
        filters: {},
      },
      {
        originEventInfo: { databaseDocumentID: 'b', databaseDocumentIndex: 'indexB' },
        indices: ['1', '2'],
        filters: {},
      },
      true,
    ],
    // 2 item in `indices`, but order reversed
    [
      {
        originEventInfo: { databaseDocumentID: 'b', databaseDocumentIndex: 'indexB' },
        indices: ['2', '1'],
        filters: {},
      },
      {
        originEventInfo: { databaseDocumentID: 'b', databaseDocumentIndex: 'indexB' },
        indices: ['1', '2'],
        filters: {},
      },
      true,
    ],
    // all parameters the same, except for the filters
    [
      {
        originEventInfo: { databaseDocumentID: 'b', databaseDocumentIndex: 'indexB' },
        indices: [],
        filters: {},
      },
      {
        originEventInfo: { databaseDocumentID: 'b', databaseDocumentIndex: 'indexB' },
        indices: [],
        filters: { to: 'to', from: 'from' },
      },
      false,
    ],
    // all parameters the same, except for the filters.to
    [
      {
        originEventInfo: { databaseDocumentID: 'b', databaseDocumentIndex: 'indexB' },
        indices: [],
        filters: { to: '100' },
      },
      {
        originEventInfo: { databaseDocumentID: 'b', databaseDocumentIndex: 'indexB' },
        indices: [],
        filters: { to: 'to' },
      },
      false,
    ],
    // all parameters the same, except for the filters.to, parameters are swapped from the one above
    [
      {
        originEventInfo: { databaseDocumentID: 'b', databaseDocumentIndex: 'indexB' },
        indices: [],
        filters: { to: 'to' },
      },
      {
        originEventInfo: { databaseDocumentID: 'b', databaseDocumentIndex: 'indexB' },
        indices: [],
        filters: { to: '100' },
      },
      false,
    ],
    // all parameters the same
    [
      {
        originEventInfo: { databaseDocumentID: 'b', databaseDocumentIndex: 'indexB' },
        indices: [],
        filters: { to: 'to', from: 'from' },
      },
      {
        originEventInfo: { databaseDocumentID: 'b', databaseDocumentIndex: 'indexB' },
        indices: [],
        filters: { to: 'to', from: 'from' },
      },
      true,
    ],
    // all parameters the same, only using the filters.to field
    [
      {
        originEventInfo: { databaseDocumentID: 'b', databaseDocumentIndex: 'indexB' },
        indices: [],
        filters: { to: 'to' },
      },
      {
        originEventInfo: { databaseDocumentID: 'b', databaseDocumentIndex: 'indexB' },
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
