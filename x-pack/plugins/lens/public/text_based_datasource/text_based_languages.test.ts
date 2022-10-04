/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock } from '@kbn/core/public/mocks';
import { IStorageWrapper } from '@kbn/kibana-utils-plugin/public';
import { expressionsPluginMock } from '@kbn/expressions-plugin/public/mocks';
import { TextBasedLanguagesPersistedState, TextBasedLanguagesPrivateState } from './types';
import { dataPluginMock } from '@kbn/data-plugin/public/mocks';
import { dataViewPluginMocks } from '@kbn/data-views-plugin/public/mocks';
import { getTextBasedLanguagesDatasource } from './text_based_languages';
import { generateId } from '../id_generator';
import { DatasourcePublicAPI, Datasource } from '../types';

jest.mock('../id_generator');

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

describe('IndexPattern Data Source', () => {
  let baseState: TextBasedLanguagesPrivateState;
  let textBasedLanguagesDatasource: Datasource<
    TextBasedLanguagesPrivateState,
    TextBasedLanguagesPersistedState
  >;

  beforeEach(() => {
    textBasedLanguagesDatasource = getTextBasedLanguagesDatasource({
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
    } as unknown as TextBasedLanguagesPrivateState;
  });

  describe('uniqueLabels', () => {
    it('appends a suffix to duplicates', () => {
      const map = textBasedLanguagesDatasource.uniqueLabels({
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
      } as unknown as TextBasedLanguagesPrivateState);

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
      expect(textBasedLanguagesDatasource.getPersistableState(baseState)).toEqual({
        state: baseState,
        savedObjectReferences: [
          { name: 'textBasedLanguages-datasource-layer-a', type: 'index-pattern', id: 'foo' },
        ],
      });
    });
  });

  describe('#insertLayer', () => {
    it('should insert an empty layer into the previous state', () => {
      expect(textBasedLanguagesDatasource.insertLayer(baseState, 'newLayer')).toEqual({
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
      expect(textBasedLanguagesDatasource.removeLayer(baseState, 'a')).toEqual({
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
      });
    });
  });

  describe('#createEmptyLayer', () => {
    it('creates state with empty layers', () => {
      expect(textBasedLanguagesDatasource.createEmptyLayer('index-pattern-id')).toEqual({
        fieldList: [],
        layers: {},
        indexPatternRefs: [],
      });
    });
  });

  describe('#getLayers', () => {
    it('should list the current layers', () => {
      expect(
        textBasedLanguagesDatasource.getLayers({
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
        } as unknown as TextBasedLanguagesPrivateState)
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
      } as unknown as TextBasedLanguagesPrivateState;
      const suggestions = textBasedLanguagesDatasource.getDatasourceSuggestionsForVisualizeField(
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
  });

  describe('#getErrorMessages', () => {
    it('should use the results of getErrorMessages directly when single layer', () => {
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
      } as unknown as TextBasedLanguagesPrivateState;
      expect(textBasedLanguagesDatasource.getErrorMessages(state, indexPatterns)).toEqual([
        { longMessage: 'error 1', shortMessage: 'error 1' },
        { longMessage: 'error 2', shortMessage: 'error 2' },
      ]);
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
      } as unknown as TextBasedLanguagesPrivateState;
      expect(
        textBasedLanguagesDatasource.isTimeBased(state, {
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
      } as unknown as TextBasedLanguagesPrivateState;
      expect(
        textBasedLanguagesDatasource.isTimeBased(state, {
          ...indexPatterns,
          '1': { ...indexPatterns['1'], timeFieldName: undefined },
        })
      ).toEqual(false);
    });
  });

  describe('#toExpression', () => {
    it('should generate an empty expression when no columns are selected', async () => {
      const state = textBasedLanguagesDatasource.initialize();
      expect(textBasedLanguagesDatasource.toExpression(state, 'first', indexPatterns)).toEqual(
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
      } as unknown as TextBasedLanguagesPrivateState;

      expect(textBasedLanguagesDatasource.toExpression(queryBaseState, 'a', indexPatterns))
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
      publicAPI = textBasedLanguagesDatasource.getPublicAPI({
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
        } as unknown as TextBasedLanguagesPrivateState;

        publicAPI = textBasedLanguagesDatasource.getPublicAPI({
          state,
          layerId: 'a',
          indexPatterns,
        });
        expect(publicAPI.getTableSpec()).toEqual([
          { columnId: 'col1', fields: ['Test 1'] },
          { columnId: 'col2', fields: ['Test 2'] },
        ]);
      });
    });

    describe('getOperationForColumnId', () => {
      it('should get an operation for col1', () => {
        expect(publicAPI.getOperationForColumnId('col1')).toEqual({
          label: 'Test 1',
          dataType: 'number',
          isBucketed: false,
          hasTimeShift: false,
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
