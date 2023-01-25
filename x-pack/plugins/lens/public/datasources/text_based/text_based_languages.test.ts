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
import { DatasourcePublicAPI, Datasource, FrameDatasourceAPI } from '../../types';

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
          query: { sql: 'SELECT * FROM foo' },
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
      const map = TextBasedDatasource.uniqueLabels({
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
      } as unknown as TextBasedPrivateState);

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
            query: { sql: 'SELECT * FROM foo' },
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

    it('should return props if field is allowed to be dropped', () => {
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
        state: baseState,
        indexPatterns,
      };
      expect(TextBasedDatasource.getDropProps(props)).toStrictEqual({
        dropTypes: ['field_add'],
        nextLabel: 'Test 1',
      });
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
            query: { sql: 'SELECT * FROM foo' },
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
              query: { sql: 'SELECT * FROM foo' },
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
              query: { sql: 'SELECT * FROM foo' },
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
      const state = {
        layers: {},
        initialContext: {
          contextualFields: ['bytes', 'dest'],
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
        layers: {
          newid: {
            allColumns: [
              {
                columnId: 'newid',
                fieldName: 'bytes',
                meta: {
                  type: 'number',
                },
              },
              {
                columnId: 'newid',
                fieldName: 'dest',
                meta: {
                  type: 'string',
                },
              },
            ],
            columns: [
              {
                columnId: 'newid',
                fieldName: 'bytes',
                meta: {
                  type: 'number',
                },
              },
              {
                columnId: 'newid',
                fieldName: 'dest',
                meta: {
                  type: 'string',
                },
              },
            ],
            index: 'foo',
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
            columnId: 'newid',
            operation: {
              dataType: 'number',
              isBucketed: false,
              label: 'bytes',
            },
          },
          {
            columnId: 'newid',
            operation: {
              dataType: 'string',
              isBucketed: true,
              label: 'dest',
            },
          },
        ],
        isMultiRow: false,
        layerId: 'newid',
      });
    });

    it('should not return suggestions if no query is given', () => {
      const state = {
        layers: {},
        initialContext: {
          contextualFields: ['bytes', 'dest'],
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
            query: { sql: 'SELECT * FROM foo' },
            index: 'foo',
          },
        },
      } as unknown as TextBasedPrivateState;
      expect(
        TextBasedDatasource.getUserMessages(state, {
          frame: { dataViews: indexPatterns } as unknown as FrameDatasourceAPI,
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
            query: { sql: 'SELECT * FROM foo' },
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
            query: { sql: 'SELECT * FROM foo' },
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
      expect(TextBasedDatasource.toExpression(state, 'first', indexPatterns, dateRange)).toEqual(
        null
      );
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
            query: { sql: 'SELECT * FROM foo' },
            index: '1',
          },
        },
        indexPatternRefs: [
          { id: '1', title: 'foo' },
          { id: '2', title: 'my-fake-restricted-pattern' },
          { id: '3', title: 'my-compatible-pattern' },
        ],
      } as unknown as TextBasedPrivateState;

      expect(TextBasedDatasource.toExpression(queryBaseState, 'a', indexPatterns, dateRange))
        .toMatchInlineSnapshot(`
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
                "query": Array [
                  "SELECT * FROM foo",
                ],
              },
              "function": "essql",
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
