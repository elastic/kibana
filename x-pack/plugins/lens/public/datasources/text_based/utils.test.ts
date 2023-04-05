/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import type { DatatableColumn } from '@kbn/expressions-plugin/public';
import { dataPluginMock } from '@kbn/data-plugin/public/mocks';
import { expressionsPluginMock } from '@kbn/expressions-plugin/public/mocks';
import { dataViewPluginMocks } from '@kbn/data-views-plugin/public/mocks';
import { mockDataViewsService } from '../../data_views_service/mocks';
import {
  getIndexPatternFromTextBasedQuery,
  loadIndexPatternRefs,
  getStateFromAggregateQuery,
  getAllColumns,
} from './utils';
import type { TextBasedLayerColumn } from './types';
import { type AggregateQuery } from '@kbn/es-query';

jest.mock('./fetch_data_from_aggregate_query', () => ({
  fetchDataFromAggregateQuery: jest.fn(() => {
    return {
      columns: [
        {
          name: 'timestamp',
          id: 'timestamp',
          meta: {
            type: 'date',
          },
        },
        {
          name: 'bytes',
          id: 'bytes',
          meta: {
            type: 'number',
          },
        },
        {
          name: 'memory',
          id: 'memory',
          meta: {
            type: 'number',
          },
        },
      ],
    };
  }),
}));

describe('Text based languages utils', () => {
  describe('getIndexPatternFromTextBasedQuery', () => {
    it('should return the index pattern for sql query', () => {
      const indexPattern = getIndexPatternFromTextBasedQuery({
        sql: 'SELECT bytes, memory from foo',
      });

      expect(indexPattern).toBe('foo');
    });

    it('should return empty index pattern for non sql query', () => {
      const indexPattern = getIndexPatternFromTextBasedQuery({
        lang1: 'SELECT bytes, memory from foo',
      } as unknown as AggregateQuery);

      expect(indexPattern).toBe('');
    });
  });

  describe('loadIndexPatternRefs', () => {
    it('should return a list of sorted indexpattern refs', async () => {
      const refs = await loadIndexPatternRefs(mockDataViewsService() as DataViewsPublicPluginStart);
      expect(refs[0].title < refs[1].title).toBeTruthy();
    });
  });

  describe('getAllColumns', () => {
    it('should remove columns that do not exist on the query and remove duplicates', async () => {
      const existingOnLayer = [
        {
          fieldName: 'time',
          columnId: 'time',
          meta: {
            type: 'date',
          },
        },
        {
          fieldName: 'bytes',
          columnId: 'bytes',
          meta: {
            type: 'number',
          },
        },
      ] as TextBasedLayerColumn[];
      const columnsFromQuery = [
        {
          name: 'timestamp',
          id: 'timestamp',
          meta: {
            type: 'date',
          },
        },
        {
          name: 'bytes',
          id: 'bytes',
          meta: {
            type: 'number',
          },
        },
        {
          name: 'memory',
          id: 'memory',
          meta: {
            type: 'number',
          },
        },
      ] as DatatableColumn[];
      const allColumns = getAllColumns(existingOnLayer, columnsFromQuery);
      expect(allColumns).toStrictEqual([
        {
          fieldName: 'bytes',
          columnId: 'bytes',
          meta: {
            type: 'number',
          },
        },
        {
          fieldName: 'timestamp',
          columnId: 'timestamp',
          meta: {
            type: 'date',
          },
        },
        {
          fieldName: 'memory',
          columnId: 'memory',
          meta: {
            type: 'number',
          },
        },
      ]);
    });
  });

  describe('getStateFromAggregateQuery', () => {
    it('should return the correct state', async () => {
      const state = {
        layers: {
          first: {
            allColumns: [],
            columns: [],
            query: undefined,
            index: '',
          },
        },
        indexPatternRefs: [],
        fieldList: [],
        initialContext: {
          contextualFields: ['bytes', 'dest'],
          query: { sql: 'SELECT * FROM "foo"' },
          fieldName: '',
          dataViewSpec: {
            title: 'foo',
            id: '1',
            name: 'Foo',
          },
        },
      };
      const dataViewsMock = dataViewPluginMocks.createStartContract();
      const dataMock = dataPluginMock.createStartContract();
      const expressionsMock = expressionsPluginMock.createStartContract();
      const updatedState = await getStateFromAggregateQuery(
        state,
        { sql: 'SELECT * FROM my-fake-index-pattern' },
        {
          ...dataViewsMock,
          getIdsWithTitle: jest.fn().mockReturnValue(
            Promise.resolve([
              { id: '1', title: 'my-fake-index-pattern' },
              { id: '2', title: 'my-fake-restricted-pattern' },
              { id: '3', title: 'my-compatible-pattern' },
            ])
          ),
          get: jest.fn().mockReturnValue(
            Promise.resolve({
              id: '1',
              title: 'my-fake-index-pattern',
              timeFieldName: 'timeField',
            })
          ),
          create: jest.fn().mockReturnValue(
            Promise.resolve({
              id: '1',
              title: 'my-fake-index-pattern',
              timeFieldName: 'timeField',
              isPersisted: () => false,
            })
          ),
        },
        dataMock,
        expressionsMock
      );

      expect(updatedState).toStrictEqual({
        initialContext: {
          contextualFields: ['bytes', 'dest'],
          query: { sql: 'SELECT * FROM "foo"' },
          fieldName: '',
          dataViewSpec: {
            title: 'foo',
            id: '1',
            name: 'Foo',
          },
        },
        fieldList: [
          {
            name: 'timestamp',
            id: 'timestamp',
            meta: {
              type: 'date',
            },
          },
          {
            name: 'bytes',
            id: 'bytes',
            meta: {
              type: 'number',
            },
          },
          {
            name: 'memory',
            id: 'memory',
            meta: {
              type: 'number',
            },
          },
        ],
        indexPatternRefs: [
          {
            id: '3',
            timeField: 'timeField',
            title: 'my-compatible-pattern',
          },
          {
            id: '1',
            timeField: 'timeField',
            title: 'my-fake-index-pattern',
          },
          {
            id: '2',
            timeField: 'timeField',
            title: 'my-fake-restricted-pattern',
          },
        ],
        layers: {
          first: {
            allColumns: [
              {
                fieldName: 'timestamp',
                columnId: 'timestamp',
                meta: {
                  type: 'date',
                },
              },
              {
                fieldName: 'bytes',
                columnId: 'bytes',
                meta: {
                  type: 'number',
                },
              },
              {
                fieldName: 'memory',
                columnId: 'memory',
                meta: {
                  type: 'number',
                },
              },
            ],
            columns: [],
            errors: [],
            index: '1',
            query: {
              sql: 'SELECT * FROM my-fake-index-pattern',
            },
            timeField: 'timeField',
          },
        },
      });
    });

    it('should return the correct state for not existing dataview', async () => {
      const state = {
        layers: {
          first: {
            allColumns: [],
            columns: [],
            query: undefined,
            index: '',
          },
        },
        indexPatternRefs: [],
        fieldList: [],
        initialContext: {
          contextualFields: ['bytes', 'dest'],
          query: { sql: 'SELECT * FROM "foo"' },
          fieldName: '',
          dataViewSpec: {
            title: 'foo',
            id: '1',
            name: 'Foo',
          },
        },
      };
      const dataViewsMock = dataViewPluginMocks.createStartContract();
      const dataMock = dataPluginMock.createStartContract();
      const expressionsMock = expressionsPluginMock.createStartContract();
      const updatedState = await getStateFromAggregateQuery(
        state,
        { sql: 'SELECT * FROM my-fake-index-*' },
        {
          ...dataViewsMock,
          getIdsWithTitle: jest.fn().mockReturnValue(
            Promise.resolve([
              { id: '1', title: 'my-fake-index-pattern' },
              { id: '2', title: 'my-fake-restricted-pattern' },
              { id: '3', title: 'my-compatible-pattern' },
            ])
          ),
          get: jest.fn().mockReturnValue(
            Promise.resolve({
              id: '1',
              title: 'my-fake-index-pattern',
              timeFieldName: 'timeField',
            })
          ),
          create: jest.fn().mockReturnValue(
            Promise.resolve({
              id: 'adHoc-id',
              title: 'my-fake-index-*',
              name: 'my-fake-index-*',
              timeFieldName: 'timeField',
              isPersisted: () => false,
              fields: {
                getByName: jest.fn().mockReturnValue({
                  type: 'date',
                }),
              },
            })
          ),
        },
        dataMock,
        expressionsMock
      );

      expect(updatedState).toStrictEqual({
        initialContext: {
          contextualFields: ['bytes', 'dest'],
          query: { sql: 'SELECT * FROM "foo"' },
          fieldName: '',
          dataViewSpec: {
            title: 'foo',
            id: '1',
            name: 'Foo',
          },
        },
        fieldList: [
          {
            name: 'timestamp',
            id: 'timestamp',
            meta: {
              type: 'date',
            },
          },
          {
            name: 'bytes',
            id: 'bytes',
            meta: {
              type: 'number',
            },
          },
          {
            name: 'memory',
            id: 'memory',
            meta: {
              type: 'number',
            },
          },
        ],
        indexPatternRefs: [
          {
            id: '3',
            timeField: 'timeField',
            title: 'my-compatible-pattern',
          },
          {
            id: '1',
            timeField: 'timeField',
            title: 'my-fake-index-pattern',
          },
          {
            id: '2',
            timeField: 'timeField',
            title: 'my-fake-restricted-pattern',
          },
          {
            id: 'adHoc-id',
            timeField: '@timestamp',
            title: 'my-fake-index-*',
          },
        ],
        layers: {
          first: {
            allColumns: [
              {
                fieldName: 'timestamp',
                columnId: 'timestamp',
                meta: {
                  type: 'date',
                },
              },
              {
                fieldName: 'bytes',
                columnId: 'bytes',
                meta: {
                  type: 'number',
                },
              },
              {
                fieldName: 'memory',
                columnId: 'memory',
                meta: {
                  type: 'number',
                },
              },
            ],
            columns: [],
            errors: [],
            index: 'adHoc-id',
            query: {
              sql: 'SELECT * FROM my-fake-index-*',
            },
            timeField: '@timestamp',
          },
        },
      });
    });
  });
});
