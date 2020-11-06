/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IStorageWrapper } from 'src/plugins/kibana_utils/public';
import { getIndexPatternDatasource, IndexPatternColumn } from './indexpattern';
import { DatasourcePublicAPI, Operation, Datasource } from '../types';
import { coreMock } from 'src/core/public/mocks';
import { IndexPatternPersistedState, IndexPatternPrivateState } from './types';
import { dataPluginMock } from '../../../../../src/plugins/data/public/mocks';
import { Ast } from '@kbn/interpreter/common';
import { chartPluginMock } from '../../../../../src/plugins/charts/public/mocks';
import { getFieldByNameFactory } from './pure_helpers';

jest.mock('./loader');
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

const fieldsTwo = [
  {
    name: 'timestamp',
    displayName: 'timestampLabel',
    type: 'date',
    aggregatable: true,
    searchable: true,
    aggregationRestrictions: {
      date_histogram: {
        agg: 'date_histogram',
        fixed_interval: '1d',
        delay: '7d',
        time_zone: 'UTC',
      },
    },
  },
  {
    name: 'bytes',
    displayName: 'bytes',
    type: 'number',
    aggregatable: true,
    searchable: true,
    aggregationRestrictions: {
      // Ignored in the UI
      histogram: {
        agg: 'histogram',
        interval: 1000,
      },
      avg: {
        agg: 'avg',
      },
      max: {
        agg: 'max',
      },
      min: {
        agg: 'min',
      },
      sum: {
        agg: 'sum',
      },
    },
  },
  {
    name: 'source',
    displayName: 'source',
    type: 'string',
    aggregatable: true,
    searchable: true,
    aggregationRestrictions: {
      terms: {
        agg: 'terms',
      },
    },
  },
];

const expectedIndexPatterns = {
  1: {
    id: '1',
    title: 'my-fake-index-pattern',
    timeFieldName: 'timestamp',
    hasRestrictions: false,
    fields: fieldsOne,
    getFieldByName: getFieldByNameFactory(fieldsOne),
  },
  2: {
    id: '2',
    title: 'my-fake-restricted-pattern',
    timeFieldName: 'timestamp',
    hasRestrictions: true,
    fields: fieldsTwo,
    getFieldByName: getFieldByNameFactory(fieldsTwo),
  },
};

type IndexPatternBaseState = Omit<
  IndexPatternPrivateState,
  'indexPatternRefs' | 'indexPatterns' | 'existingFields' | 'isFirstExistenceFetch'
>;

function enrichBaseState(baseState: IndexPatternBaseState): IndexPatternPrivateState {
  return {
    currentIndexPatternId: baseState.currentIndexPatternId,
    layers: baseState.layers,
    indexPatterns: expectedIndexPatterns,
    indexPatternRefs: [],
    existingFields: {},
    isFirstExistenceFetch: false,
  };
}

describe('IndexPattern Data Source', () => {
  let baseState: Omit<
    IndexPatternPrivateState,
    'indexPatternRefs' | 'indexPatterns' | 'existingFields' | 'isFirstExistenceFetch'
  >;
  let indexPatternDatasource: Datasource<IndexPatternPrivateState, IndexPatternPersistedState>;

  beforeEach(() => {
    indexPatternDatasource = getIndexPatternDatasource({
      storage: {} as IStorageWrapper,
      core: coreMock.createStart(),
      data: dataPluginMock.createStartContract(),
      charts: chartPluginMock.createSetupContract(),
    });

    baseState = {
      currentIndexPatternId: '1',
      layers: {
        first: {
          indexPatternId: '1',
          columnOrder: ['col1'],
          columns: {
            col1: {
              label: 'My Op',
              dataType: 'string',
              isBucketed: true,

              // Private
              operationType: 'terms',
              sourceField: 'op',
              params: {
                size: 5,
                orderBy: { type: 'alphabetical' },
                orderDirection: 'asc',
              },
            },
          },
        },
      },
    };
  });

  describe('uniqueLabels', () => {
    it('appends a suffix to duplicates', () => {
      const col: IndexPatternColumn = {
        dataType: 'number',
        isBucketed: false,
        label: 'Foo',
        operationType: 'count',
        sourceField: 'Records',
      };
      const map = indexPatternDatasource.uniqueLabels(({
        layers: {
          a: {
            columnOrder: ['a', 'b'],
            columns: {
              a: col,
              b: col,
            },
            indexPatternId: 'foo',
          },
          b: {
            columnOrder: ['c', 'd'],
            columns: {
              c: col,
              d: {
                ...col,
                label: 'Foo [1]',
              },
            },
            indexPatternId: 'foo',
          },
        },
      } as unknown) as IndexPatternPrivateState);

      expect(map).toMatchInlineSnapshot(`
        Object {
          "a": "Foo",
          "b": "Foo [1]",
          "c": "Foo [2]",
          "d": "Foo [1] [1]",
        }
      `);
    });
  });

  describe('#getPersistedState', () => {
    it('should persist from saved state', async () => {
      const state = enrichBaseState(baseState);

      expect(indexPatternDatasource.getPersistableState(state)).toEqual({
        state: {
          layers: {
            first: {
              columnOrder: ['col1'],
              columns: {
                col1: {
                  label: 'My Op',
                  dataType: 'string',
                  isBucketed: true,

                  // Private
                  operationType: 'terms',
                  sourceField: 'op',
                  params: {
                    size: 5,
                    orderBy: { type: 'alphabetical' },
                    orderDirection: 'asc',
                  },
                },
              },
            },
          },
        },
        savedObjectReferences: [
          { name: 'indexpattern-datasource-current-indexpattern', type: 'index-pattern', id: '1' },
          { name: 'indexpattern-datasource-layer-first', type: 'index-pattern', id: '1' },
        ],
      });
    });
  });

  describe('#toExpression', () => {
    it('should generate an empty expression when no columns are selected', async () => {
      const state = await indexPatternDatasource.initialize();
      expect(indexPatternDatasource.toExpression(state, 'first')).toEqual(null);
    });

    it('should generate an expression for an aggregated query', async () => {
      const queryBaseState: IndexPatternBaseState = {
        currentIndexPatternId: '1',
        layers: {
          first: {
            indexPatternId: '1',
            columnOrder: ['col1', 'col2'],
            columns: {
              col1: {
                label: 'Count of records',
                dataType: 'number',
                isBucketed: false,
                sourceField: 'Records',
                operationType: 'count',
              },
              col2: {
                label: 'Date',
                dataType: 'date',
                isBucketed: true,
                operationType: 'date_histogram',
                sourceField: 'timestamp',
                params: {
                  interval: '1d',
                },
              },
            },
          },
        },
      };

      const state = enrichBaseState(queryBaseState);

      expect(indexPatternDatasource.toExpression(state, 'first')).toMatchInlineSnapshot(`
        Object {
          "chain": Array [
            Object {
              "arguments": Object {
                "aggConfigs": Array [
                  "[{\\"id\\":\\"col1\\",\\"enabled\\":true,\\"type\\":\\"count\\",\\"schema\\":\\"metric\\",\\"params\\":{}},{\\"id\\":\\"col2\\",\\"enabled\\":true,\\"type\\":\\"date_histogram\\",\\"schema\\":\\"segment\\",\\"params\\":{\\"field\\":\\"timestamp\\",\\"useNormalizedEsInterval\\":true,\\"interval\\":\\"1d\\",\\"drop_partials\\":false,\\"min_doc_count\\":0,\\"extended_bounds\\":{}}}]",
                ],
                "includeFormatHints": Array [
                  true,
                ],
                "index": Array [
                  "1",
                ],
                "metricsAtAllLevels": Array [
                  false,
                ],
                "partialRows": Array [
                  false,
                ],
                "timeFields": Array [
                  "timestamp",
                ],
              },
              "function": "esaggs",
              "type": "function",
            },
            Object {
              "arguments": Object {
                "idMap": Array [
                  "{\\"col-0-col1\\":{\\"label\\":\\"Count of records\\",\\"dataType\\":\\"number\\",\\"isBucketed\\":false,\\"sourceField\\":\\"Records\\",\\"operationType\\":\\"count\\",\\"id\\":\\"col1\\"},\\"col-1-col2\\":{\\"label\\":\\"Date\\",\\"dataType\\":\\"date\\",\\"isBucketed\\":true,\\"operationType\\":\\"date_histogram\\",\\"sourceField\\":\\"timestamp\\",\\"params\\":{\\"interval\\":\\"1d\\"},\\"id\\":\\"col2\\"}}",
                ],
              },
              "function": "lens_rename_columns",
              "type": "function",
            },
          ],
          "type": "expression",
        }
      `);
    });

    it('should put all time fields used in date_histograms to the esaggs timeFields parameter', async () => {
      const queryBaseState: IndexPatternBaseState = {
        currentIndexPatternId: '1',
        layers: {
          first: {
            indexPatternId: '1',
            columnOrder: ['col1', 'col2', 'col3'],
            columns: {
              col1: {
                label: 'Count of records',
                dataType: 'number',
                isBucketed: false,
                sourceField: 'Records',
                operationType: 'count',
              },
              col2: {
                label: 'Date',
                dataType: 'date',
                isBucketed: true,
                operationType: 'date_histogram',
                sourceField: 'timestamp',
                params: {
                  interval: 'auto',
                },
              },
              col3: {
                label: 'Date 2',
                dataType: 'date',
                isBucketed: true,
                operationType: 'date_histogram',
                sourceField: 'another_datefield',
                params: {
                  interval: 'auto',
                },
              },
            },
          },
        },
      };

      const state = enrichBaseState(queryBaseState);

      const ast = indexPatternDatasource.toExpression(state, 'first') as Ast;
      expect(ast.chain[0].arguments.timeFields).toEqual(['timestamp', 'another_datefield']);
    });

    it('should rename the output from esaggs when using flat query', () => {
      const queryBaseState: IndexPatternBaseState = {
        currentIndexPatternId: '1',
        layers: {
          first: {
            indexPatternId: '1',
            columnOrder: ['bucket1', 'bucket2', 'metric'],
            columns: {
              metric: {
                label: 'Count of records',
                dataType: 'number',
                isBucketed: false,
                sourceField: 'Records',
                operationType: 'count',
              },
              bucket1: {
                label: 'Date',
                dataType: 'date',
                isBucketed: true,
                operationType: 'date_histogram',
                sourceField: 'timestamp',
                params: {
                  interval: '1d',
                },
              },
              bucket2: {
                label: 'Terms',
                dataType: 'string',
                isBucketed: true,
                operationType: 'terms',
                sourceField: 'geo.src',
                params: {
                  orderBy: { type: 'alphabetical' },
                  orderDirection: 'asc',
                  size: 10,
                },
              },
            },
          },
        },
      };

      const state = enrichBaseState(queryBaseState);
      const ast = indexPatternDatasource.toExpression(state, 'first') as Ast;
      expect(ast.chain[0].arguments.metricsAtAllLevels).toEqual([false]);
      expect(JSON.parse(ast.chain[1].arguments.idMap[0] as string)).toEqual({
        'col-0-bucket1': expect.any(Object),
        'col-1-bucket2': expect.any(Object),
        'col-2-metric': expect.any(Object),
      });
    });

    it('should not put date fields used outside date_histograms to the esaggs timeFields parameter', async () => {
      const queryBaseState: IndexPatternBaseState = {
        currentIndexPatternId: '1',
        layers: {
          first: {
            indexPatternId: '1',
            columnOrder: ['col1', 'col2'],
            columns: {
              col1: {
                label: 'Count of records',
                dataType: 'date',
                isBucketed: false,
                sourceField: 'timefield',
                operationType: 'cardinality',
              },
              col2: {
                label: 'Date',
                dataType: 'date',
                isBucketed: true,
                operationType: 'date_histogram',
                sourceField: 'timestamp',
                params: {
                  interval: 'auto',
                },
              },
            },
          },
        },
      };

      const state = enrichBaseState(queryBaseState);

      const ast = indexPatternDatasource.toExpression(state, 'first') as Ast;
      expect(ast.chain[0].arguments.timeFields).toEqual(['timestamp']);
      expect(ast.chain[0].arguments.timeFields).not.toContain('timefield');
    });
  });

  describe('#insertLayer', () => {
    it('should insert an empty layer into the previous state', () => {
      const state = {
        indexPatternRefs: [],
        existingFields: {},
        indexPatterns: expectedIndexPatterns,
        layers: {
          first: {
            indexPatternId: '1',
            columnOrder: [],
            columns: {},
          },
          second: {
            indexPatternId: '2',
            columnOrder: [],
            columns: {},
          },
        },
        currentIndexPatternId: '1',
        isFirstExistenceFetch: false,
      };
      expect(indexPatternDatasource.insertLayer(state, 'newLayer')).toEqual({
        ...state,
        layers: {
          ...state.layers,
          newLayer: {
            indexPatternId: '1',
            columnOrder: [],
            columns: {},
          },
        },
      });
    });
  });

  describe('#removeLayer', () => {
    it('should remove a layer', () => {
      const state = {
        indexPatternRefs: [],
        existingFields: {},
        isFirstExistenceFetch: false,
        indexPatterns: expectedIndexPatterns,
        layers: {
          first: {
            indexPatternId: '1',
            columnOrder: [],
            columns: {},
          },
          second: {
            indexPatternId: '2',
            columnOrder: [],
            columns: {},
          },
        },
        currentIndexPatternId: '1',
      };
      expect(indexPatternDatasource.removeLayer(state, 'first')).toEqual({
        ...state,
        layers: {
          second: {
            indexPatternId: '2',
            columnOrder: [],
            columns: {},
          },
        },
      });
    });
  });

  describe('#getLayers', () => {
    it('should list the current layers', () => {
      expect(
        indexPatternDatasource.getLayers({
          indexPatternRefs: [],
          existingFields: {},
          isFirstExistenceFetch: false,
          indexPatterns: expectedIndexPatterns,
          layers: {
            first: {
              indexPatternId: '1',
              columnOrder: [],
              columns: {},
            },
            second: {
              indexPatternId: '2',
              columnOrder: [],
              columns: {},
            },
          },
          currentIndexPatternId: '1',
        })
      ).toEqual(['first', 'second']);
    });
  });

  describe('#getPublicAPI', () => {
    let publicAPI: DatasourcePublicAPI;

    beforeEach(async () => {
      const initialState = enrichBaseState(baseState);
      publicAPI = indexPatternDatasource.getPublicAPI({
        state: initialState,
        layerId: 'first',
      });
    });

    describe('getTableSpec', () => {
      it('should include col1', () => {
        expect(publicAPI.getTableSpec()).toEqual([
          {
            columnId: 'col1',
          },
        ]);
      });
    });

    describe('getOperationForColumnId', () => {
      it('should get an operation for col1', () => {
        expect(publicAPI.getOperationForColumnId('col1')).toEqual({
          label: 'My Op',
          dataType: 'string',
          isBucketed: true,
        } as Operation);
      });

      it('should return null for non-existant columns', () => {
        expect(publicAPI.getOperationForColumnId('col2')).toBe(null);
      });
    });
  });

  describe('#getErrorMessages', () => {
    it('should detect a missing reference in a layer', () => {
      const state = {
        indexPatternRefs: [],
        existingFields: {},
        isFirstExistenceFetch: false,
        indexPatterns: expectedIndexPatterns,
        layers: {
          first: {
            indexPatternId: '1',
            columnOrder: ['col1'],
            columns: {
              col1: {
                dataType: 'number',
                isBucketed: false,
                label: 'Foo',
                operationType: 'count', // <= invalid
                sourceField: 'bytes',
              },
            },
          },
        },
        currentIndexPatternId: '1',
      };
      const messages = indexPatternDatasource.getErrorMessages(state as IndexPatternPrivateState);
      expect(messages).toHaveLength(1);
      expect(messages![0]).toEqual({
        shortMessage: 'Invalid reference.',
        longMessage: 'Field "bytes" has an invalid reference.',
      });
    });

    it('should detect and batch missing references in a layer', () => {
      const state = {
        indexPatternRefs: [],
        existingFields: {},
        isFirstExistenceFetch: false,
        indexPatterns: expectedIndexPatterns,
        layers: {
          first: {
            indexPatternId: '1',
            columnOrder: ['col1', 'col2'],
            columns: {
              col1: {
                dataType: 'number',
                isBucketed: false,
                label: 'Foo',
                operationType: 'count', // <= invalid
                sourceField: 'bytes',
              },
              col2: {
                dataType: 'number',
                isBucketed: false,
                label: 'Foo',
                operationType: 'count', // <= invalid
                sourceField: 'memory',
              },
            },
          },
        },
        currentIndexPatternId: '1',
      };
      const messages = indexPatternDatasource.getErrorMessages(state as IndexPatternPrivateState);
      expect(messages).toHaveLength(1);
      expect(messages![0]).toEqual({
        shortMessage: 'Invalid references.',
        longMessage: 'Fields "bytes", "memory" have invalid reference.',
      });
    });

    it('should detect and batch missing references in multiple layers', () => {
      const state = {
        indexPatternRefs: [],
        existingFields: {},
        isFirstExistenceFetch: false,
        indexPatterns: expectedIndexPatterns,
        layers: {
          first: {
            indexPatternId: '1',
            columnOrder: ['col1', 'col2'],
            columns: {
              col1: {
                dataType: 'number',
                isBucketed: false,
                label: 'Foo',
                operationType: 'count', // <= invalid
                sourceField: 'bytes',
              },
              col2: {
                dataType: 'number',
                isBucketed: false,
                label: 'Foo',
                operationType: 'count', // <= invalid
                sourceField: 'memory',
              },
            },
          },
          second: {
            indexPatternId: '1',
            columnOrder: ['col1'],
            columns: {
              col1: {
                dataType: 'string',
                isBucketed: false,
                label: 'Foo',
                operationType: 'count', // <= invalid
                sourceField: 'source',
              },
            },
          },
        },
        currentIndexPatternId: '1',
      };
      const messages = indexPatternDatasource.getErrorMessages(state as IndexPatternPrivateState);
      expect(messages).toHaveLength(2);
      expect(messages).toEqual([
        {
          shortMessage: 'Invalid references on Layer 1.',
          longMessage: 'Layer 1 has invalid references in fields "bytes", "memory".',
        },
        {
          shortMessage: 'Invalid reference on Layer 2.',
          longMessage: 'Layer 2 has an invalid reference in field "source".',
        },
      ]);
    });

    it('should return no errors if all references are satified', () => {
      const state = {
        indexPatternRefs: [],
        existingFields: {},
        isFirstExistenceFetch: false,
        indexPatterns: expectedIndexPatterns,
        layers: {
          first: {
            indexPatternId: '1',
            columnOrder: ['col1'],
            columns: {
              col1: {
                dataType: 'number',
                isBucketed: false,
                label: 'Foo',
                operationType: 'document',
                sourceField: 'bytes',
              },
            },
          },
        },
        currentIndexPatternId: '1',
      };
      expect(
        indexPatternDatasource.getErrorMessages(state as IndexPatternPrivateState)
      ).not.toBeDefined();
    });

    it('should return no errors with layers with no columns', () => {
      const state: IndexPatternPrivateState = {
        indexPatternRefs: [],
        existingFields: {},
        isFirstExistenceFetch: false,
        indexPatterns: expectedIndexPatterns,
        layers: {
          first: {
            indexPatternId: '1',
            columnOrder: [],
            columns: {},
          },
        },
        currentIndexPatternId: '1',
      };
      expect(indexPatternDatasource.getErrorMessages(state)).not.toBeDefined();
    });
  });
});
