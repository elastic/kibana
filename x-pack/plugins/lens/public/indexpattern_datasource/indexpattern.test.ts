/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
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
import {
  operationDefinitionMap,
  getErrorMessages,
  createMockedReferenceOperation,
} from './operations';

jest.mock('./loader');
jest.mock('../id_generator');
jest.mock('./operations');

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
                "aggs": Array [
                  Object {
                    "chain": Array [
                      Object {
                        "arguments": Object {
                          "enabled": Array [
                            true,
                          ],
                          "id": Array [
                            "col1",
                          ],
                          "schema": Array [
                            "metric",
                          ],
                        },
                        "function": "aggCount",
                        "type": "function",
                      },
                    ],
                    "type": "expression",
                  },
                  Object {
                    "chain": Array [
                      Object {
                        "arguments": Object {
                          "drop_partials": Array [
                            false,
                          ],
                          "enabled": Array [
                            true,
                          ],
                          "extended_bounds": Array [
                            "{}",
                          ],
                          "field": Array [
                            "timestamp",
                          ],
                          "id": Array [
                            "col2",
                          ],
                          "interval": Array [
                            "1d",
                          ],
                          "min_doc_count": Array [
                            0,
                          ],
                          "schema": Array [
                            "segment",
                          ],
                          "useNormalizedEsInterval": Array [
                            true,
                          ],
                        },
                        "function": "aggDateHistogram",
                        "type": "function",
                      },
                    ],
                    "type": "expression",
                  },
                ],
                "index": Array [
                  Object {
                    "chain": Array [
                      Object {
                        "arguments": Object {
                          "id": Array [
                            "1",
                          ],
                        },
                        "function": "indexPatternLoad",
                        "type": "function",
                      },
                    ],
                    "type": "expression",
                  },
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

    it('should add the suffix to the remap column id if provided by the operation', async () => {
      const queryBaseState: IndexPatternBaseState = {
        currentIndexPatternId: '1',
        layers: {
          first: {
            indexPatternId: '1',
            columnOrder: ['def', 'abc'],
            columns: {
              abc: {
                label: '23rd percentile',
                dataType: 'number',
                isBucketed: false,
                sourceField: 'bytes',
                operationType: 'percentile',
                params: {
                  percentile: 23,
                },
              },
              def: {
                label: 'Terms',
                dataType: 'string',
                isBucketed: true,
                operationType: 'terms',
                sourceField: 'source',
                params: {
                  size: 5,
                  orderBy: {
                    type: 'alphabetical',
                  },
                  orderDirection: 'asc',
                },
              },
            },
          },
        },
      };

      const state = enrichBaseState(queryBaseState);

      const ast = indexPatternDatasource.toExpression(state, 'first') as Ast;
      expect(Object.keys(JSON.parse(ast.chain[1].arguments.idMap[0] as string))).toEqual([
        'col-0-def',
        // col-1 is the auto naming of esasggs, abc is the specified column id, .23 is the generated suffix
        'col-1-abc.23',
      ]);
    });

    it('should add time_scale and format function if time scale is set and supported', async () => {
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
                timeScale: 'h',
              },
              col2: {
                label: 'Average of bytes',
                dataType: 'number',
                isBucketed: false,
                sourceField: 'bytes',
                operationType: 'avg',
                timeScale: 'h',
              },
              col3: {
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
      const timeScaleCalls = ast.chain.filter((fn) => fn.function === 'lens_time_scale');
      const formatCalls = ast.chain.filter((fn) => fn.function === 'lens_format_column');
      expect(timeScaleCalls).toHaveLength(1);
      expect(timeScaleCalls[0].arguments).toMatchInlineSnapshot(`
        Object {
          "dateColumnId": Array [
            "col3",
          ],
          "inputColumnId": Array [
            "col1",
          ],
          "outputColumnId": Array [
            "col1",
          ],
          "outputColumnName": Array [
            "Count of records",
          ],
          "targetUnit": Array [
            "h",
          ],
        }
      `);
      expect(formatCalls[0]).toMatchInlineSnapshot(`
        Object {
          "arguments": Object {
            "columnId": Array [
              "col1",
            ],
            "format": Array [
              "",
            ],
            "parentFormat": Array [
              "{\\"id\\":\\"suffix\\",\\"params\\":{\\"unit\\":\\"h\\"}}",
            ],
          },
          "function": "lens_format_column",
          "type": "function",
        }
      `);
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

    describe('references', () => {
      beforeEach(() => {
        // @ts-expect-error we are inserting an invalid type
        operationDefinitionMap.testReference = createMockedReferenceOperation();

        // @ts-expect-error we are inserting an invalid type
        operationDefinitionMap.testReference.toExpression.mockReturnValue(['mock']);
      });

      afterEach(() => {
        delete operationDefinitionMap.testReference;
      });

      it('should collect expression references and append them', async () => {
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
                  label: 'Reference',
                  dataType: 'number',
                  isBucketed: false,
                  // @ts-expect-error not a valid type
                  operationType: 'testReference',
                  references: ['col1'],
                },
              },
            },
          },
        };

        const state = enrichBaseState(queryBaseState);

        const ast = indexPatternDatasource.toExpression(state, 'first') as Ast;
        // @ts-expect-error we can't isolate just the reference type
        expect(operationDefinitionMap.testReference.toExpression).toHaveBeenCalled();
        expect(ast.chain[2]).toEqual('mock');
      });
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
        expect(publicAPI.getTableSpec()).toEqual([{ columnId: 'col1' }]);
      });

      it('should skip columns that are being referenced', () => {
        publicAPI = indexPatternDatasource.getPublicAPI({
          state: {
            ...enrichBaseState(baseState),
            layers: {
              first: {
                indexPatternId: '1',
                columnOrder: ['col1', 'col2'],
                columns: {
                  col1: {
                    label: 'Sum',
                    dataType: 'number',
                    isBucketed: false,

                    operationType: 'sum',
                    sourceField: 'test',
                    params: {},
                  } as IndexPatternColumn,
                  col2: {
                    label: 'Cumulative sum',
                    dataType: 'number',
                    isBucketed: false,

                    operationType: 'cumulative_sum',
                    references: ['col1'],
                    params: {},
                  } as IndexPatternColumn,
                },
              },
            },
          },
          layerId: 'first',
        });

        expect(publicAPI.getTableSpec()).toEqual([{ columnId: 'col2' }]);
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

      it('should return null for referenced columns', () => {
        publicAPI = indexPatternDatasource.getPublicAPI({
          state: {
            ...enrichBaseState(baseState),
            layers: {
              first: {
                indexPatternId: '1',
                columnOrder: ['col1', 'col2'],
                columns: {
                  col1: {
                    label: 'Sum',
                    dataType: 'number',
                    isBucketed: false,

                    operationType: 'sum',
                    sourceField: 'test',
                    params: {},
                  } as IndexPatternColumn,
                  col2: {
                    label: 'Cumulative sum',
                    dataType: 'number',
                    isBucketed: false,

                    operationType: 'cumulative_sum',
                    references: ['col1'],
                    params: {},
                  } as IndexPatternColumn,
                },
              },
            },
          },
          layerId: 'first',
        });
        expect(publicAPI.getOperationForColumnId('col1')).toEqual(null);
      });
    });
  });

  describe('#getErrorMessages', () => {
    it('should use the results of getErrorMessages directly when single layer', () => {
      (getErrorMessages as jest.Mock).mockClear();
      (getErrorMessages as jest.Mock).mockReturnValueOnce(['error 1', 'error 2']);
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
      expect(indexPatternDatasource.getErrorMessages(state)).toEqual([
        { longMessage: 'error 1', shortMessage: '' },
        { longMessage: 'error 2', shortMessage: '' },
      ]);
      expect(getErrorMessages).toHaveBeenCalledTimes(1);
    });

    it('should prepend each error with its layer number on multi-layer chart', () => {
      (getErrorMessages as jest.Mock).mockClear();
      (getErrorMessages as jest.Mock).mockReturnValueOnce(['error 1', 'error 2']);
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
          second: {
            indexPatternId: '1',
            columnOrder: [],
            columns: {},
          },
        },
        currentIndexPatternId: '1',
      };
      expect(indexPatternDatasource.getErrorMessages(state)).toEqual([
        { longMessage: 'Layer 1 error: error 1', shortMessage: '' },
        { longMessage: 'Layer 1 error: error 2', shortMessage: '' },
      ]);
      expect(getErrorMessages).toHaveBeenCalledTimes(2);
    });
  });

  describe('#updateStateOnCloseDimension', () => {
    it('should not update when there are no incomplete columns', () => {
      expect(
        indexPatternDatasource.updateStateOnCloseDimension!({
          state: {
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
                    operationType: 'avg',
                    sourceField: 'bytes',
                  },
                },
                incompleteColumns: {},
              },
            },
            currentIndexPatternId: '1',
          },
          layerId: 'first',
          columnId: 'col1',
        })
      ).toBeUndefined();
    });

    it('should clear the incomplete column', () => {
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
            incompleteColumns: {
              col1: { operationType: 'avg' as const },
              col2: { operationType: 'sum' as const },
            },
          },
        },
        currentIndexPatternId: '1',
      };
      expect(
        indexPatternDatasource.updateStateOnCloseDimension!({
          state,
          layerId: 'first',
          columnId: 'col1',
        })
      ).toEqual({
        ...state,
        layers: {
          first: {
            indexPatternId: '1',
            columnOrder: [],
            columns: {},
            incompleteColumns: { col2: { operationType: 'sum' } },
          },
        },
      });
    });
  });
});
