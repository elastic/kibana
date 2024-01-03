/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock } from '@kbn/core/public/mocks';
import { IStorageWrapper } from '@kbn/kibana-utils-plugin/public';
import { expressionsPluginMock } from '@kbn/expressions-plugin/public/mocks';
import { TextBasedPersistedState, TextBasedPrivateState } from './types';
import { dataPluginMock } from '@kbn/data-plugin/public/mocks';
import { dataViewPluginMocks } from '@kbn/data-views-plugin/public/mocks';
import { getTextBasedDatasource } from './text_based_languages';
import { generateId } from '../../id_generator';
import { DatasourcePublicAPI, Datasource, FramePublicAPI } from '../../types';

jest.mock('../../id_generator');

const fieldsOne = [
  {
    name: 'timestamp',
    displayName: 'timestampLabel',
    type: 'date',
    aggregatable: true,
    searchable: true,
  },
  {
    name: 'start_date',
    displayName: 'start_date',
    type: 'date',
    aggregatable: true,
    searchable: true,
  },
  {
    name: 'bytes',
    displayName: 'bytes',
    type: 'number',
    aggregatable: true,
    searchable: true,
  },
  {
    name: 'memory',
    displayName: 'memory',
    type: 'number',
    aggregatable: true,
    searchable: true,
  },
  {
    name: 'source',
    displayName: 'source',
    type: 'string',
    aggregatable: true,
    searchable: true,
  },
  {
    name: 'dest',
    displayName: 'dest',
    type: 'string',
    aggregatable: true,
    searchable: true,
  },
];

const expectedIndexPatterns = {
  1: {
    id: '1',
    title: 'foo',
    timeFieldName: 'timestamp',
    hasRestrictions: false,
    fields: fieldsOne,
    getFieldByName: jest.fn(),
    spec: {},
    isPersisted: true,
  },
};

const indexPatterns = expectedIndexPatterns;
const dateRange = {
  fromDate: '2022-03-17T08:25:00.000Z',
  toDate: '2022-04-17T08:25:00.000Z',
};

describe('Textbased Data Source', () => {
  let baseState: TextBasedPrivateState;
  let TextBasedDatasource: Datasource<TextBasedPrivateState, TextBasedPersistedState>;

  beforeEach(() => {
    TextBasedDatasource = getTextBasedDatasource({
      storage: {} as IStorageWrapper,
      core: coreMock.createStart(),
      data: dataPluginMock.createStartContract(),
      dataViews: dataViewPluginMocks.createStartContract(),
      expressions: expressionsPluginMock.createStartContract(),
    });

    baseState = {
      layers: {
        a: {
          columns: [
            {
              columnId: 'col1',
              fieldName: 'Test 1',
              meta: {
                type: 'number',
              },
            },
          ],
          allColumns: [
            {
              columnId: 'col1',
              fieldName: 'Test 1',
              meta: {
                type: 'number',
              },
            },
          ],
          index: 'foo',
          query: { esql: 'FROM foo' },
        },
      },
      fieldList: [
        {
          id: 'col1',
          name: 'Test 1',
          meta: {
            type: 'number',
          },
        },
      ],
    } as unknown as TextBasedPrivateState;
  });

  describe('uniqueLabels', () => {
    it('appends a suffix to duplicates', () => {
      const map = TextBasedDatasource.uniqueLabels(
        {
          layers: {
            a: {
              columns: [
                {
                  columnId: 'a',
                  fieldName: 'Foo',
                  meta: {
                    type: 'number',
                  },
                },
                {
                  columnId: 'b',
                  fieldName: 'Foo',
                  meta: {
                    type: 'number',
                  },
                },
              ],
              index: 'foo',
            },
          },
        } as unknown as TextBasedPrivateState,
        {}
      );

      expect(map).toMatchInlineSnapshot(`
        Object {
          "a": "Foo",
          "b": "Foo [1]",
        }
      `);
    });
  });

  describe('#getPersistedState', () => {
    it('should persist from saved state', async () => {
      expect(TextBasedDatasource.getPersistableState(baseState)).toEqual({
        state: {
          layers: baseState.layers,
        },
        savedObjectReferences: [
          { name: 'textBasedLanguages-datasource-layer-a', type: 'index-pattern', id: 'foo' },
        ],
      });
    });
  });

  describe('#getSelectedFields', () => {
    it('should return the fields used per layer', async () => {
      expect(TextBasedDatasource?.getSelectedFields?.(baseState)).toEqual(['Test 1']);
    });

    it('should return empty array for empty layers', async () => {
      const state = {
        ...baseState,
        layers: {},
      };
      expect(TextBasedDatasource?.getSelectedFields?.(state)).toEqual([]);
    });
  });

  describe('#getDropProps', () => {
    it('should return undefined if source is not present', () => {
      const props = {
        target: {
          layerId: 'a',
          groupId: 'groupId',
          columnId: 'col1',
          filterOperations: jest.fn(),
        },
        state: baseState,
        indexPatterns,
      };
      expect(TextBasedDatasource.getDropProps(props)).toBeUndefined();
    });

    it('should return undefined if target group not allows non numeric fields', () => {
      const newState = {
        ...baseState,
        layers: {
          a: {
            columns: [],
            allColumns: [
              {
                columnId: 'col1',
                fieldName: 'Test 1',
                meta: {
                  type: 'string',
                },
              },
            ],
            query: { esql: 'FROM foo' },
            index: 'foo',
          },
        },
      } as unknown as TextBasedPrivateState;
      const props = {
        target: {
          layerId: 'a',
          groupId: 'groupId',
          columnId: 'col1',
          filterOperations: jest.fn(),
          isMetricDimension: true,
        },
        source: {
          id: 'col1',
          field: 'Test 1',
          humanData: {
            label: 'Test 1',
          },
        },
        state: newState,
        indexPatterns,
      };
      expect(TextBasedDatasource.getDropProps(props)).toBeUndefined();
    });
  });

  describe('#insertLayer', () => {
    it('should insert an empty layer into the previous state', () => {
      expect(TextBasedDatasource.insertLayer(baseState, 'newLayer')).toEqual({
        ...baseState,
        layers: {
          ...baseState.layers,
          newLayer: {
            index: 'foo',
            query: { esql: 'FROM foo' },
            allColumns: [
              {
                columnId: 'col1',
                fieldName: 'Test 1',
                meta: {
                  type: 'number',
                },
              },
            ],
            columns: [],
          },
        },
      });
    });
  });

  describe('#removeLayer', () => {
    it('should remove a layer', () => {
      expect(TextBasedDatasource.removeLayer(baseState, 'a')).toEqual({
        removedLayerIds: ['a'],
        newState: {
          ...baseState,
          layers: {
            a: {
              columns: [],
              allColumns: [
                {
                  columnId: 'col1',
                  fieldName: 'Test 1',
                  meta: {
                    type: 'number',
                  },
                },
              ],
              query: { esql: 'FROM foo' },
              index: 'foo',
            },
          },
        },
      });
    });
  });

  describe('#createEmptyLayer', () => {
    it('creates state with empty layers', () => {
      expect(TextBasedDatasource.createEmptyLayer('index-pattern-id')).toEqual({
        fieldList: [],
        layers: {},
        indexPatternRefs: [],
      });
    });
  });

  describe('#getLayers', () => {
    it('should list the current layers', () => {
      expect(
        TextBasedDatasource.getLayers({
          layers: {
            a: {
              columns: [
                {
                  columnId: 'a',
                  fieldName: 'Test 1',
                  meta: {
                    type: 'number',
                  },
                },
                {
                  columnId: 'b',
                  fieldName: 'Test 2',
                  meta: {
                    type: 'number',
                  },
                },
              ],
              allColumns: [
                {
                  columnId: 'a',
                  fieldName: 'Test 1',
                  meta: {
                    type: 'number',
                  },
                },
                {
                  columnId: 'b',
                  fieldName: 'Test 2',
                  meta: {
                    type: 'number',
                  },
                },
              ],
              query: { esql: 'FROM foo' },
              index: 'foo',
            },
          },
        } as unknown as TextBasedPrivateState)
      ).toEqual(['a']);
    });
  });

  describe('#getDatasourceSuggestionsForVisualizeField', () => {
    (generateId as jest.Mock).mockReturnValue(`newid`);
    it('should create the correct layers', () => {
      const textBasedQueryColumns = [
        {
          id: 'bytes',
          name: 'bytes',
          meta: {
            type: 'number',
          },
        },
        {
          id: 'dest',
          name: 'dest',
          meta: {
            type: 'string',
          },
        },
      ];
      const state = {
        layers: {},
        initialContext: {
          textBasedColumns: textBasedQueryColumns,
          query: { sql: 'SELECT * FROM "foo"' },
          dataViewSpec: {
            title: 'foo',
            id: '1',
            name: 'Foo',
          },
        },
      } as unknown as TextBasedPrivateState;
      const suggestions = TextBasedDatasource.getDatasourceSuggestionsForVisualizeField(
        state,
        '1',
        '',
        indexPatterns
      );
      expect(suggestions[0].state).toEqual({
        ...state,
        initialContext: undefined,
        fieldList: textBasedQueryColumns,
        indexPatternRefs: [
          {
            id: '1',
            timeField: undefined,
            title: 'foo',
          },
        ],
        layers: {
          newid: {
            allColumns: [
              {
                columnId: 'bytes',
                fieldName: 'bytes',
                inMetricDimension: true,
                meta: {
                  type: 'number',
                },
              },
              {
                columnId: 'dest',
                fieldName: 'dest',
                meta: {
                  type: 'string',
                },
              },
            ],
            columns: [
              {
                columnId: 'bytes',
                fieldName: 'bytes',
                inMetricDimension: true,
                meta: {
                  type: 'number',
                },
              },
              {
                columnId: 'dest',
                fieldName: 'dest',
                meta: {
                  type: 'string',
                },
              },
            ],
            index: '1',
            query: {
              sql: 'SELECT * FROM "foo"',
            },
          },
        },
      });

      expect(suggestions[0].table).toEqual({
        changeType: 'initial',
        columns: [
          {
            columnId: 'bytes',
            operation: {
              dataType: 'number',
              isBucketed: false,
              label: 'bytes',
            },
          },
          {
            columnId: 'dest',
            operation: {
              dataType: 'string',
              isBucketed: true,
              label: 'dest',
            },
          },
        ],
        isMultiRow: false,
        layerId: 'newid',
        notAssignedMetrics: false,
      });
    });

    it('should not return suggestions if no query is given', () => {
      const state = {
        layers: {},
        initialContext: {
          textBasedColumns: [
            {
              id: 'bytes',
              name: 'bytes',
              meta: {
                type: 'number',
              },
            },
            {
              id: 'dest',
              name: 'dest',
              meta: {
                type: 'string',
              },
            },
          ],
          dataViewSpec: {
            title: 'foo',
            id: '1',
            name: 'Foo',
          },
        },
      } as unknown as TextBasedPrivateState;
      const suggestions = TextBasedDatasource.getDatasourceSuggestionsForVisualizeField(
        state,
        '1',
        '',
        indexPatterns
      );
      expect(suggestions).toEqual([]);
    });

    it('should return the correct suggestions if non numeric columns are given', () => {
      const textBasedQueryColumns = [
        {
          id: '@timestamp',
          name: '@timestamp',
          meta: {
            type: 'date',
          },
        },
        {
          id: 'dest',
          name: 'dest',
          meta: {
            type: 'string',
          },
        },
      ];
      const state = {
        layers: {},
        initialContext: {
          textBasedColumns: textBasedQueryColumns,
          query: { esql: 'from foo' },
          dataViewSpec: {
            title: 'foo',
            id: '1',
            name: 'Foo',
          },
        },
      } as unknown as TextBasedPrivateState;
      const suggestions = TextBasedDatasource.getDatasourceSuggestionsForVisualizeField(
        state,
        '1',
        '',
        indexPatterns
      );
      expect(suggestions[0].state).toEqual({
        ...state,
        initialContext: undefined,
        fieldList: textBasedQueryColumns,
        indexPatternRefs: [
          {
            id: '1',
            timeField: undefined,
            title: 'foo',
          },
        ],
        layers: {
          newid: {
            allColumns: [
              {
                columnId: '@timestamp',
                fieldName: '@timestamp',
                inMetricDimension: true,
                meta: {
                  type: 'date',
                },
              },
              {
                columnId: 'dest',
                fieldName: 'dest',
                inMetricDimension: true,
                meta: {
                  type: 'string',
                },
              },
            ],
            columns: [
              {
                columnId: '@timestamp',
                fieldName: '@timestamp',
                inMetricDimension: true,
                meta: {
                  type: 'date',
                },
              },
              {
                columnId: 'dest',
                fieldName: 'dest',
                inMetricDimension: true,
                meta: {
                  type: 'string',
                },
              },
            ],
            index: '1',
            query: {
              esql: 'from foo',
            },
          },
        },
      });

      expect(suggestions[0].table).toEqual({
        changeType: 'initial',
        columns: [
          {
            columnId: '@timestamp',
            operation: {
              dataType: 'date',
              isBucketed: true,
              label: '@timestamp',
            },
          },
          {
            columnId: 'dest',
            operation: {
              dataType: 'string',
              isBucketed: true,
              label: 'dest',
            },
          },
        ],
        isMultiRow: false,
        layerId: 'newid',
        notAssignedMetrics: true,
      });
    });
  });

  describe('#suggestsLimitedColumns', () => {
    it('should return true if query returns big number of columns', () => {
      const fieldList = [
        {
          id: 'a',
          name: 'Test 1',
          meta: {
            type: 'number',
          },
        },
        {
          id: 'b',
          name: 'Test 2',
          meta: {
            type: 'number',
          },
        },
        {
          id: 'c',
          name: 'Test 3',
          meta: {
            type: 'date',
          },
        },
        {
          id: 'd',
          name: 'Test 4',
          meta: {
            type: 'string',
          },
        },
        {
          id: 'e',
          name: 'Test 5',
          meta: {
            type: 'string',
          },
        },
      ];
      const state = {
        fieldList,
        layers: {
          a: {
            query: { esql: 'from foo' },
            index: 'foo',
          },
        },
      } as unknown as TextBasedPrivateState;
      expect(TextBasedDatasource?.suggestsLimitedColumns?.(state)).toBeTruthy();
    });
  });

  describe('#getUserMessages', () => {
    it('should use the results of getUserMessages directly when single layer', () => {
      const state = {
        layers: {
          a: {
            columns: [
              {
                columnId: 'a',
                fieldName: 'Test 1',
                meta: {
                  type: 'number',
                },
              },
              {
                columnId: 'b',
                fieldName: 'Test 2',
                meta: {
                  type: 'number',
                },
              },
            ],
            allColumns: [
              {
                columnId: 'a',
                fieldName: 'Test 1',
                meta: {
                  type: 'number',
                },
              },
              {
                columnId: 'b',
                fieldName: 'Test 2',
                meta: {
                  type: 'number',
                },
              },
            ],
            errors: [new Error('error 1'), new Error('error 2')],
            query: { esql: 'FROM foo' },
            index: 'foo',
          },
        },
      } as unknown as TextBasedPrivateState;
      expect(
        TextBasedDatasource.getUserMessages(state, {
          frame: { dataViews: indexPatterns } as unknown as FramePublicAPI,
          setState: () => {},
        })
      ).toMatchInlineSnapshot(`
        Array [
          Object {
            "displayLocations": Array [
              Object {
                "id": "visualization",
              },
              Object {
                "id": "textBasedLanguagesQueryInput",
              },
            ],
            "fixableInEditor": true,
            "longMessage": "error 1",
            "severity": "error",
            "shortMessage": "error 1",
          },
          Object {
            "displayLocations": Array [
              Object {
                "id": "visualization",
              },
              Object {
                "id": "textBasedLanguagesQueryInput",
              },
            ],
            "fixableInEditor": true,
            "longMessage": "error 2",
            "severity": "error",
            "shortMessage": "error 2",
          },
        ]
      `);
    });
  });

  describe('#isTimeBased', () => {
    it('should return true if timefield name exists on the dataview', () => {
      const state = {
        layers: {
          a: {
            columns: [
              {
                columnId: 'a',
                fieldName: 'Test 1',
                meta: {
                  type: 'number',
                },
              },
              {
                columnId: 'b',
                fieldName: 'Test 2',
                meta: {
                  type: 'number',
                },
              },
            ],
            allColumns: [
              {
                columnId: 'a',
                fieldName: 'Test 1',
                meta: {
                  type: 'number',
                },
              },
              {
                columnId: 'b',
                fieldName: 'Test 2',
                meta: {
                  type: 'number',
                },
              },
            ],
            query: { esql: 'FROM foo' },
            index: '1',
          },
        },
      } as unknown as TextBasedPrivateState;
      expect(
        TextBasedDatasource.isTimeBased(state, {
          ...indexPatterns,
        })
      ).toEqual(true);
    });
    it('should return false if timefield name not exists on the selected dataview', () => {
      const state = {
        layers: {
          a: {
            columns: [
              {
                columnId: 'a',
                fieldName: 'Test 1',
                meta: {
                  type: 'number',
                },
              },
              {
                columnId: 'b',
                fieldName: 'Test 2',
                meta: {
                  type: 'number',
                },
              },
            ],
            allColumns: [
              {
                columnId: 'a',
                fieldName: 'Test 1',
                meta: {
                  type: 'number',
                },
              },
              {
                columnId: 'b',
                fieldName: 'Test 2',
                meta: {
                  type: 'number',
                },
              },
            ],
            query: { esql: 'FROM foo' },
            index: '1',
          },
        },
      } as unknown as TextBasedPrivateState;
      expect(
        TextBasedDatasource.isTimeBased(state, {
          ...indexPatterns,
          '1': { ...indexPatterns['1'], timeFieldName: undefined },
        })
      ).toEqual(false);
    });
  });

  describe('#toExpression', () => {
    it('should generate an empty expression when no columns are selected', async () => {
      const state = TextBasedDatasource.initialize();
      expect(
        TextBasedDatasource.toExpression(state, 'first', indexPatterns, dateRange, new Date())
      ).toEqual(null);
    });

    it('should generate an expression for an SQL query', async () => {
      const queryBaseState = {
        layers: {
          a: {
            columns: [
              {
                columnId: 'a',
                fieldName: 'Test 1',
                meta: {
                  type: 'number',
                },
              },
              {
                columnId: 'b',
                fieldName: 'Test 2',
                meta: {
                  type: 'number',
                },
              },
            ],
            allColumns: [
              {
                columnId: 'a',
                fieldName: 'Test 1',
                meta: {
                  type: 'number',
                },
              },
              {
                columnId: 'b',
                fieldName: 'Test 2',
                meta: {
                  type: 'number',
                },
              },
            ],
            query: { esql: 'FROM foo' },
            index: '1',
          },
        },
        indexPatternRefs: [
          { id: '1', title: 'foo' },
          { id: '2', title: 'my-fake-restricted-pattern' },
          { id: '3', title: 'my-compatible-pattern' },
        ],
      } as unknown as TextBasedPrivateState;

      expect(
        TextBasedDatasource.toExpression(queryBaseState, 'a', indexPatterns, dateRange, new Date())
      ).toMatchInlineSnapshot(`
        Object {
          "chain": Array [
            Object {
              "arguments": Object {},
              "function": "kibana",
              "type": "function",
            },
            Object {
              "arguments": Object {},
              "function": "kibana_context",
              "type": "function",
            },
            Object {
              "arguments": Object {
                "locale": Array [
                  "en",
                ],
                "query": Array [
                  "FROM foo",
                ],
              },
              "function": "esql",
              "type": "function",
            },
            Object {
              "arguments": Object {
                "idMap": Array [
                  "{\\"Test 1\\":[{\\"id\\":\\"a\\",\\"label\\":\\"Test 1\\"}],\\"Test 2\\":[{\\"id\\":\\"b\\",\\"label\\":\\"Test 2\\"}]}",
                ],
              },
              "function": "lens_map_to_columns",
              "type": "function",
            },
          ],
          "type": "expression",
        }
      `);
    });
  });

  describe('#getPublicAPI', () => {
    let publicAPI: DatasourcePublicAPI;

    beforeEach(async () => {
      publicAPI = TextBasedDatasource.getPublicAPI({
        state: baseState,
        layerId: 'a',
        indexPatterns,
      });
    });

    describe('getTableSpec', () => {
      it('should include col1', () => {
        expect(publicAPI.getTableSpec()).toEqual([expect.objectContaining({ columnId: 'col1' })]);
      });

      it('should include fields prop for each column', () => {
        expect(publicAPI.getTableSpec()).toEqual([expect.objectContaining({ fields: ['Test 1'] })]);
      });

      it('should collect all fields ', () => {
        const state = {
          layers: {
            a: {
              columns: [
                {
                  columnId: 'col1',
                  fieldName: 'Test 1',
                  meta: {
                    type: 'number',
                  },
                },
                {
                  columnId: 'col2',
                  fieldName: 'Test 2',
                  meta: {
                    type: 'number',
                  },
                },
              ],
              index: 'foo',
            },
          },
          fieldList: [
            {
              id: 'col1',
              name: 'Test 1',
              meta: {
                type: 'number',
              },
            },
            {
              id: 'col2',
              name: 'Test 2',
              meta: {
                type: 'number',
              },
            },
          ],
        } as unknown as TextBasedPrivateState;

        publicAPI = TextBasedDatasource.getPublicAPI({
          state,
          layerId: 'a',
          indexPatterns,
        });
        expect(publicAPI.getTableSpec()).toEqual([
          { columnId: 'col1', fields: ['Test 1'] },
          { columnId: 'col2', fields: ['Test 2'] },
        ]);
      });

      it('should return only the columns that exist on the query', () => {
        const state = {
          ...baseState,
          fieldList: [
            {
              id: 'col2',
              name: 'Test 2',
              meta: {
                type: 'number',
              },
            },
          ],
        } as unknown as TextBasedPrivateState;

        publicAPI = TextBasedDatasource.getPublicAPI({
          state,
          layerId: 'a',
          indexPatterns,
        });
        expect(publicAPI.getTableSpec()).toEqual([]);
      });
    });

    describe('getOperationForColumnId', () => {
      it('should get an operation for col1', () => {
        expect(publicAPI.getOperationForColumnId('col1')).toEqual({
          label: 'Test 1',
          dataType: 'number',
          isBucketed: false,
          hasTimeShift: false,
          hasReducedTimeRange: false,
        });
      });

      it('should return null for non-existant columns', () => {
        expect(publicAPI.getOperationForColumnId('col2')).toBe(null);
      });
    });

    describe('getSourceId', () => {
      it('should basically return the datasource internal id', () => {
        expect(publicAPI.getSourceId()).toEqual('foo');
      });
    });
  });
});
