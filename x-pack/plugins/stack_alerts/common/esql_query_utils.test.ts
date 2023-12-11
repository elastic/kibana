/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { rowToDocument, toEsQueryHits, transformDatatableToEsqlTable } from './esql_query_utils';

describe('ESQL query utils', () => {
  describe('rowToDocument', () => {
    it('correctly converts ESQL row to document', () => {
      expect(
        rowToDocument(
          [
            { name: '@timestamp', type: 'date' },
            { name: 'ecs.version', type: 'keyword' },
            { name: 'error.code', type: 'keyword' },
          ],
          ['2023-07-12T13:32:04.174Z', '1.8.0', null]
        )
      ).toEqual({
        '@timestamp': '2023-07-12T13:32:04.174Z',
        'ecs.version': '1.8.0',
        'error.code': null,
      });
    });
  });

  describe('toEsQueryHits', () => {
    it('correctly converts ESQL table to ES query hits', () => {
      expect(
        toEsQueryHits({
          columns: [
            { name: '@timestamp', type: 'date' },
            { name: 'ecs.version', type: 'keyword' },
            { name: 'error.code', type: 'keyword' },
          ],
          values: [['2023-07-12T13:32:04.174Z', '1.8.0', null]],
        })
      ).toEqual({
        hits: [
          {
            _id: 'esql_query_document',
            _index: '',
            _source: {
              '@timestamp': '2023-07-12T13:32:04.174Z',
              'ecs.version': '1.8.0',
              'error.code': null,
            },
          },
        ],
        total: 1,
      });
    });
  });

  describe('transformDatatableToEsqlTable', () => {
    it('correctly converts data table to ESQL table', () => {
      expect(
        transformDatatableToEsqlTable({
          type: 'datatable',
          columns: [
            { id: '@timestamp', name: '@timestamp', meta: { type: 'date' } },
            { id: 'ecs.version', name: 'ecs.version', meta: { type: 'string' } },
            { id: 'error.code', name: 'error.code', meta: { type: 'string' } },
          ],
          rows: [
            {
              '@timestamp': '2023-07-12T13:32:04.174Z',
              'ecs.version': '1.8.0',
              'error.code': null,
            },
          ],
        })
      ).toEqual({
        columns: [
          {
            name: '@timestamp',
            type: 'date',
          },
          {
            name: 'ecs.version',
            type: 'string',
          },
          {
            name: 'error.code',
            type: 'string',
          },
        ],
        values: [['2023-07-12T13:32:04.174Z', '1.8.0', null]],
      });
    });
  });
});
