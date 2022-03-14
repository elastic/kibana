/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { IStorageWrapper } from 'src/plugins/kibana_utils/public';
import { getIndexPatternDatasource, GenericIndexPatternColumn } from './indexpattern';
import { DatasourcePublicAPI, Datasource, FramePublicAPI, OperationDescriptor } from '../types';
import { coreMock } from 'src/core/public/mocks';
import { IndexPatternPersistedState, IndexPatternPrivateState } from './types';
import { dataPluginMock } from '../../../../../src/plugins/data/public/mocks';
import { dataViewPluginMocks } from '../../../../../src/plugins/data_views/public/mocks';
import { Ast } from '@kbn/interpreter';
import { chartPluginMock } from '../../../../../src/plugins/charts/public/mocks';
import { getFieldByNameFactory } from './pure_helpers';
import {
  operationDefinitionMap,
  getErrorMessages,
  TermsIndexPatternColumn,
  DateHistogramIndexPatternColumn,
  MovingAverageIndexPatternColumn,
  MathIndexPatternColumn,
  FormulaIndexPatternColumn,
  RangeIndexPatternColumn,
  FiltersIndexPatternColumn,
} from './operations';
import { createMockedFullReference } from './operations/mocks';
import { indexPatternFieldEditorPluginMock } from 'src/plugins/data_view_field_editor/public/mocks';
import { uiActionsPluginMock } from '../../../../../src/plugins/ui_actions/public/mocks';
import { fieldFormatsServiceMock } from '../../../../../src/plugins/field_formats/public/mocks';
import { TinymathAST } from 'packages/kbn-tinymath';
import { SavedObjectReference } from 'kibana/server';
import { cloneDeep } from 'lodash';

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

type DataViewBaseState = Omit<
  IndexPatternPrivateState,
  'indexPatternRefs' | 'indexPatterns' | 'existingFields' | 'isFirstExistenceFetch'
>;

function enrichBaseState(baseState: DataViewBaseState): IndexPatternPrivateState {
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
      dataViews: dataViewPluginMocks.createStartContract(),
      fieldFormats: fieldFormatsServiceMock.createStartContract(),
      charts: chartPluginMock.createSetupContract(),
      dataViewFieldEditor: indexPatternFieldEditorPluginMock.createStartContract(),
      uiActions: uiActionsPluginMock.createStartContract(),
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
            } as TermsIndexPatternColumn,
          },
        },
      },
    };
  });

  describe('uniqueLabels', () => {
    it('appends a suffix to duplicates', () => {
      const col: GenericIndexPatternColumn = {
        dataType: 'number',
        isBucketed: false,
        label: 'Foo',
        operationType: 'count',
        sourceField: '___records___',
      };
      const map = indexPatternDatasource.uniqueLabels({
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
      } as unknown as IndexPatternPrivateState);

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

    it('should create a table when there is a formula without aggs', async () => {
      const queryBaseState: DataViewBaseState = {
        currentIndexPatternId: '1',
        layers: {
          first: {
            indexPatternId: '1',
            columnOrder: ['col1'],
            columns: {
              col1: {
                label: 'Formula',
                dataType: 'number',
                isBucketed: false,
                operationType: 'formula',
                references: [],
                params: {},
              },
            },
          },
        },
      };
      const state = enrichBaseState(queryBaseState);
      expect(indexPatternDatasource.toExpression(state, 'first')).toEqual({
        chain: [
          {
            function: 'createTable',
            type: 'function',
            arguments: { ids: [], names: [], rowCount: [1] },
          },
          {
            arguments: { expression: [''], id: ['col1'], name: ['Formula'] },
            function: 'mapColumn',
            type: 'function',
          },
        ],
        type: 'expression',
      });
    });

    it('should generate an expression for an aggregated query', async () => {
      const queryBaseState: DataViewBaseState = {
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
                sourceField: '___records___',
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
              } as DateHistogramIndexPatternColumn,
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
                            "0",
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
                            Object {
                              "chain": Array [
                                Object {
                                  "arguments": Object {},
                                  "function": "extendedBounds",
                                  "type": "function",
                                },
                              ],
                              "type": "expression",
                            },
                          ],
                          "field": Array [
                            "timestamp",
                          ],
                          "id": Array [
                            "1",
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
                  "{\\"col-0-0\\":{\\"label\\":\\"Count of records\\",\\"dataType\\":\\"number\\",\\"isBucketed\\":false,\\"sourceField\\":\\"___records___\\",\\"operationType\\":\\"count\\",\\"id\\":\\"col1\\"},\\"col-1-1\\":{\\"label\\":\\"Date\\",\\"dataType\\":\\"date\\",\\"isBucketed\\":true,\\"operationType\\":\\"date_histogram\\",\\"sourceField\\":\\"timestamp\\",\\"params\\":{\\"interval\\":\\"1d\\"},\\"id\\":\\"col2\\"}}",
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

    it('should put all time fields used in date_histograms to the esaggs timeFields parameter if not ignoring global time range', async () => {
      const queryBaseState: DataViewBaseState = {
        currentIndexPatternId: '1',
        layers: {
          first: {
            indexPatternId: '1',
            columnOrder: ['col1', 'col2', 'col3', 'col4'],
            columns: {
              col1: {
                label: 'Count of records',
                dataType: 'number',
                isBucketed: false,
                sourceField: '___records___',
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
              } as DateHistogramIndexPatternColumn,
              col3: {
                label: 'Date 2',
                dataType: 'date',
                isBucketed: true,
                operationType: 'date_histogram',
                sourceField: 'another_datefield',
                params: {
                  interval: 'auto',
                },
              } as DateHistogramIndexPatternColumn,
              col4: {
                label: 'Date 3',
                dataType: 'date',
                isBucketed: true,
                operationType: 'date_histogram',
                sourceField: 'yet_another_datefield',
                params: {
                  interval: '2d',
                  ignoreTimeRange: true,
                },
              } as DateHistogramIndexPatternColumn,
            },
          },
        },
      };

      const state = enrichBaseState(queryBaseState);

      const ast = indexPatternDatasource.toExpression(state, 'first') as Ast;
      expect(ast.chain[0].arguments.timeFields).toEqual(['timestamp', 'another_datefield']);
    });

    it('should pass time shift parameter to metric agg functions', async () => {
      const queryBaseState: DataViewBaseState = {
        currentIndexPatternId: '1',
        layers: {
          first: {
            indexPatternId: '1',
            columnOrder: ['col2', 'col1'],
            columns: {
              col1: {
                label: 'Count of records',
                dataType: 'number',
                isBucketed: false,
                sourceField: '___records___',
                operationType: 'count',
                timeShift: '1d',
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
              } as DateHistogramIndexPatternColumn,
            },
          },
        },
      };

      const state = enrichBaseState(queryBaseState);

      const ast = indexPatternDatasource.toExpression(state, 'first') as Ast;
      expect((ast.chain[0].arguments.aggs[1] as Ast).chain[0].arguments.timeShift).toEqual(['1d']);
    });

    it('should wrap filtered metrics in filtered metric aggregation', async () => {
      const queryBaseState: DataViewBaseState = {
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
                sourceField: '___records___',
                operationType: 'count',
                timeScale: 'h',
                filter: {
                  language: 'kuery',
                  query: 'bytes > 5',
                },
              },
              col2: {
                label: 'Average of bytes',
                dataType: 'number',
                isBucketed: false,
                sourceField: 'bytes',
                operationType: 'average',
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
              } as DateHistogramIndexPatternColumn,
            },
          },
        },
      };

      const state = enrichBaseState(queryBaseState);

      const ast = indexPatternDatasource.toExpression(state, 'first') as Ast;
      expect(ast.chain[0].arguments.aggs[0]).toMatchInlineSnapshot(`
        Object {
          "chain": Array [
            Object {
              "arguments": Object {
                "customBucket": Array [
                  Object {
                    "chain": Array [
                      Object {
                        "arguments": Object {
                          "enabled": Array [
                            true,
                          ],
                          "filter": Array [
                            Object {
                              "chain": Array [
                                Object {
                                  "arguments": Object {
                                    "q": Array [
                                      "bytes > 5",
                                    ],
                                  },
                                  "function": "kql",
                                  "type": "function",
                                },
                              ],
                              "type": "expression",
                            },
                          ],
                          "id": Array [
                            "0-filter",
                          ],
                          "schema": Array [
                            "bucket",
                          ],
                        },
                        "function": "aggFilter",
                        "type": "function",
                      },
                    ],
                    "type": "expression",
                  },
                ],
                "customMetric": Array [
                  Object {
                    "chain": Array [
                      Object {
                        "arguments": Object {
                          "enabled": Array [
                            true,
                          ],
                          "id": Array [
                            "0-metric",
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
                ],
                "enabled": Array [
                  true,
                ],
                "id": Array [
                  "0",
                ],
                "schema": Array [
                  "metric",
                ],
              },
              "function": "aggFilteredMetric",
              "type": "function",
            },
          ],
          "type": "expression",
        }
      `);
    });

    it('should add time_scale and format function if time scale is set and supported', async () => {
      const queryBaseState: DataViewBaseState = {
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
                sourceField: '___records___',
                operationType: 'count',
                timeScale: 'h',
              },
              col2: {
                label: 'Average of bytes',
                dataType: 'number',
                isBucketed: false,
                sourceField: 'bytes',
                operationType: 'average',
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
              } as DateHistogramIndexPatternColumn,
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

    it('should put column formatters after calculated columns', async () => {
      const queryBaseState: DataViewBaseState = {
        currentIndexPatternId: '1',
        layers: {
          first: {
            indexPatternId: '1',
            columnOrder: ['bucket', 'metric', 'calculated'],
            columns: {
              bucket: {
                label: 'Date',
                dataType: 'date',
                isBucketed: true,
                operationType: 'date_histogram',
                sourceField: 'timestamp',
                params: {
                  interval: 'auto',
                },
              } as DateHistogramIndexPatternColumn,
              metric: {
                label: 'Count of records',
                dataType: 'number',
                isBucketed: false,
                sourceField: '___records___',
                operationType: 'count',
                timeScale: 'h',
              },
              calculated: {
                label: 'Moving average of bytes',
                dataType: 'number',
                isBucketed: false,
                operationType: 'moving_average',
                references: ['metric'],
                params: {
                  window: 5,
                },
              } as MovingAverageIndexPatternColumn,
            },
          },
        },
      };

      const state = enrichBaseState(queryBaseState);

      const ast = indexPatternDatasource.toExpression(state, 'first') as Ast;
      const formatIndex = ast.chain.findIndex((fn) => fn.function === 'lens_format_column');
      const calculationIndex = ast.chain.findIndex((fn) => fn.function === 'moving_average');
      expect(calculationIndex).toBeLessThan(formatIndex);
    });

    it('should rename the output from esaggs when using flat query', () => {
      const queryBaseState: DataViewBaseState = {
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
                sourceField: '___records___',
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
              } as DateHistogramIndexPatternColumn,
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
              } as TermsIndexPatternColumn,
            },
          },
        },
      };

      const state = enrichBaseState(queryBaseState);
      const ast = indexPatternDatasource.toExpression(state, 'first') as Ast;
      expect(ast.chain[0].arguments.metricsAtAllLevels).toEqual([false]);
      expect(JSON.parse(ast.chain[1].arguments.idMap[0] as string)).toEqual({
        'col-0-0': expect.objectContaining({ id: 'bucket1' }),
        'col-1-1': expect.objectContaining({ id: 'bucket2' }),
        'col-2-2': expect.objectContaining({ id: 'metric' }),
      });
    });

    it('should not put date fields used outside date_histograms to the esaggs timeFields parameter', async () => {
      const queryBaseState: DataViewBaseState = {
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
                operationType: 'unique_count',
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
              } as DateHistogramIndexPatternColumn,
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
        operationDefinitionMap.testReference = createMockedFullReference();

        // @ts-expect-error we are inserting an invalid type
        operationDefinitionMap.testReference.toExpression.mockReturnValue(['mock']);
      });

      afterEach(() => {
        delete operationDefinitionMap.testReference;
      });

      it('should collect expression references and append them', async () => {
        const queryBaseState: DataViewBaseState = {
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
                  operationType: 'unique_count',
                },
                col2: {
                  label: 'Reference',
                  dataType: 'number',
                  isBucketed: false,
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

      it('should keep correct column mapping keys with reference columns present', async () => {
        const queryBaseState: DataViewBaseState = {
          currentIndexPatternId: '1',
          layers: {
            first: {
              indexPatternId: '1',
              columnOrder: ['col2', 'col1'],
              columns: {
                col1: {
                  label: 'Count of records',
                  dataType: 'date',
                  isBucketed: false,
                  sourceField: 'timefield',
                  operationType: 'unique_count',
                },
                col2: {
                  label: 'Reference',
                  dataType: 'number',
                  isBucketed: false,
                  operationType: 'testReference',
                  references: ['col1'],
                },
              },
            },
          },
        };

        const state = enrichBaseState(queryBaseState);

        const ast = indexPatternDatasource.toExpression(state, 'first') as Ast;
        expect(JSON.parse(ast.chain[1].arguments.idMap[0] as string)).toEqual({
          'col-0-0': expect.objectContaining({
            id: 'col1',
          }),
        });
      });

      it('should topologically sort references', () => {
        // This is a real example of count() + count()
        const queryBaseState: DataViewBaseState = {
          currentIndexPatternId: '1',
          layers: {
            first: {
              indexPatternId: '1',
              columnOrder: ['date', 'count', 'formula', 'countX0', 'math'],
              columns: {
                count: {
                  label: 'count',
                  dataType: 'number',
                  operationType: 'count',
                  isBucketed: false,
                  scale: 'ratio',
                  sourceField: '___records___',
                  customLabel: true,
                },
                date: {
                  label: 'timestamp',
                  dataType: 'date',
                  operationType: 'date_histogram',
                  sourceField: 'timestamp',
                  isBucketed: true,
                  scale: 'interval',
                  params: {
                    interval: 'auto',
                  },
                } as DateHistogramIndexPatternColumn,
                formula: {
                  label: 'Formula',
                  dataType: 'number',
                  operationType: 'formula',
                  isBucketed: false,
                  scale: 'ratio',
                  params: {
                    formula: 'count() + count()',
                    isFormulaBroken: false,
                  },
                  references: ['math'],
                } as FormulaIndexPatternColumn,
                countX0: {
                  label: 'countX0',
                  dataType: 'number',
                  operationType: 'count',
                  isBucketed: false,
                  scale: 'ratio',
                  sourceField: '___records___',
                  customLabel: true,
                },
                math: {
                  label: 'math',
                  dataType: 'number',
                  operationType: 'math',
                  isBucketed: false,
                  scale: 'ratio',
                  params: {
                    tinymathAst: {
                      type: 'function',
                      name: 'add',
                      args: ['countX0', 'count'] as unknown as TinymathAST[],
                      location: {
                        min: 0,
                        max: 17,
                      },
                      text: 'count() + count()',
                    },
                  },
                  references: ['countX0', 'count'],
                  customLabel: true,
                } as MathIndexPatternColumn,
              },
            },
          },
        };

        const state = enrichBaseState(queryBaseState);

        const ast = indexPatternDatasource.toExpression(state, 'first') as Ast;
        const chainLength = ast.chain.length;
        expect(ast.chain[chainLength - 2].arguments.name).toEqual(['math']);
        expect(ast.chain[chainLength - 1].arguments.id).toEqual(['formula']);
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
        expect(publicAPI.getTableSpec()).toEqual([expect.objectContaining({ columnId: 'col1' })]);
      });

      it('should include fields prop for each column', () => {
        expect(publicAPI.getTableSpec()).toEqual([expect.objectContaining({ fields: ['op'] })]);
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
                  } as GenericIndexPatternColumn,
                  col2: {
                    label: 'Cumulative sum',
                    dataType: 'number',
                    isBucketed: false,

                    operationType: 'cumulative_sum',
                    references: ['col1'],
                    params: {},
                  } as GenericIndexPatternColumn,
                },
              },
            },
          },
          layerId: 'first',
        });

        expect(publicAPI.getTableSpec()).toEqual([expect.objectContaining({ columnId: 'col2' })]);
      });

      it('should collect all fields (also from referenced columns)', () => {
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
                  } as GenericIndexPatternColumn,
                  col2: {
                    label: 'Cumulative sum',
                    dataType: 'number',
                    isBucketed: false,

                    operationType: 'cumulative_sum',
                    references: ['col1'],
                    params: {},
                  } as GenericIndexPatternColumn,
                },
              },
            },
          },
          layerId: 'first',
        });
        // The cumulative sum column has no field, but it references a sum column (hidden) which has it
        // The getTableSpec() should walk the reference tree and assign all fields to the root column
        expect(publicAPI.getTableSpec()).toEqual([{ columnId: 'col2', fields: ['test'] }]);
      });

      it('should collect and organize fields per visible column', () => {
        publicAPI = indexPatternDatasource.getPublicAPI({
          state: {
            ...enrichBaseState(baseState),
            layers: {
              first: {
                indexPatternId: '1',
                columnOrder: ['col1', 'col2', 'col3'],
                columns: {
                  col1: {
                    label: 'Sum',
                    dataType: 'number',
                    isBucketed: false,

                    operationType: 'sum',
                    sourceField: 'test',
                    params: {},
                  } as GenericIndexPatternColumn,
                  col2: {
                    label: 'Cumulative sum',
                    dataType: 'number',
                    isBucketed: false,

                    operationType: 'cumulative_sum',
                    references: ['col1'],
                    params: {},
                  } as GenericIndexPatternColumn,
                  col3: {
                    label: 'My Op',
                    dataType: 'string',
                    isBucketed: true,
                    operationType: 'terms',
                    sourceField: 'op',
                    params: {
                      size: 5,
                      orderBy: { type: 'alphabetical' },
                      orderDirection: 'asc',
                    },
                  } as TermsIndexPatternColumn,
                },
              },
            },
          },
          layerId: 'first',
        });

        // col1 is skipped as referenced but its field gets inherited by col2
        expect(publicAPI.getTableSpec()).toEqual([
          { columnId: 'col2', fields: ['test'] },
          { columnId: 'col3', fields: ['op'] },
        ]);
      });
    });

    describe('getOperationForColumnId', () => {
      it('should get an operation for col1', () => {
        expect(publicAPI.getOperationForColumnId('col1')).toEqual({
          label: 'My Op',
          dataType: 'string',
          isBucketed: true,
          isStaticValue: false,
          hasTimeShift: false,
        } as OperationDescriptor);
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
                  } as GenericIndexPatternColumn,
                  col2: {
                    label: 'Cumulative sum',
                    dataType: 'number',
                    isBucketed: false,

                    operationType: 'cumulative_sum',
                    references: ['col1'],
                    params: {},
                  } as GenericIndexPatternColumn,
                },
              },
            },
          },
          layerId: 'first',
        });
        expect(publicAPI.getOperationForColumnId('col1')).toEqual(null);
      });
    });

    describe('getSourceId', () => {
      it('should basically return the datasource internal id', () => {
        expect(publicAPI.getSourceId()).toEqual('1');
      });
    });

    describe('getFilters', () => {
      it('should return all filters in metrics, grouped by language', () => {
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
                    filter: { language: 'kuery', query: 'bytes > 1000' },
                  } as GenericIndexPatternColumn,
                  col2: {
                    label: 'Sum',
                    dataType: 'number',
                    isBucketed: false,
                    operationType: 'sum',
                    sourceField: 'test',
                    params: {},
                    filter: { language: 'lucene', query: 'memory' },
                  } as GenericIndexPatternColumn,
                },
              },
            },
          },
          layerId: 'first',
        });
        expect(publicAPI.getFilters()).toEqual({
          enabled: {
            kuery: [[{ language: 'kuery', query: 'bytes > 1000' }]],
            lucene: [[{ language: 'lucene', query: 'memory' }]],
          },
          disabled: { kuery: [], lucene: [] },
        });
      });
      it('should ignore empty filtered metrics', () => {
        publicAPI = indexPatternDatasource.getPublicAPI({
          state: {
            ...enrichBaseState(baseState),
            layers: {
              first: {
                indexPatternId: '1',
                columnOrder: ['col1'],
                columns: {
                  col1: {
                    label: 'Sum',
                    dataType: 'number',
                    isBucketed: false,
                    operationType: 'sum',
                    sourceField: 'test',
                    params: {},
                    filter: { language: 'kuery', query: '' },
                  } as GenericIndexPatternColumn,
                },
              },
            },
          },
          layerId: 'first',
        });
        expect(publicAPI.getFilters()).toEqual({
          enabled: { kuery: [], lucene: [] },
          disabled: { kuery: [], lucene: [] },
        });
      });
      it('shuold collect top values fields as kuery existence filters if no data is provided', () => {
        publicAPI = indexPatternDatasource.getPublicAPI({
          state: {
            ...enrichBaseState(baseState),
            layers: {
              first: {
                indexPatternId: '1',
                columnOrder: ['col1', 'col2'],
                columns: {
                  col1: {
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
                  } as TermsIndexPatternColumn,
                  col2: {
                    label: 'Terms',
                    dataType: 'string',
                    isBucketed: true,
                    operationType: 'terms',
                    sourceField: 'geo.dest',
                    params: {
                      orderBy: { type: 'alphabetical' },
                      orderDirection: 'asc',
                      size: 10,
                      secondaryFields: ['myField'],
                    },
                  } as TermsIndexPatternColumn,
                },
              },
            },
          },
          layerId: 'first',
        });
        expect(publicAPI.getFilters()).toEqual({
          enabled: {
            kuery: [
              [{ language: 'kuery', query: 'geo.src: *' }],
              [
                { language: 'kuery', query: 'geo.dest: *' },
                { language: 'kuery', query: 'myField: *' },
              ],
            ],
            lucene: [],
          },
          disabled: { kuery: [], lucene: [] },
        });
      });
      it('shuold collect top values fields and terms as kuery filters if data is provided', () => {
        publicAPI = indexPatternDatasource.getPublicAPI({
          state: {
            ...enrichBaseState(baseState),
            layers: {
              first: {
                indexPatternId: '1',
                columnOrder: ['col1', 'col2'],
                columns: {
                  col1: {
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
                  } as TermsIndexPatternColumn,
                  col2: {
                    label: 'Terms',
                    dataType: 'string',
                    isBucketed: true,
                    operationType: 'terms',
                    sourceField: 'geo.dest',
                    params: {
                      orderBy: { type: 'alphabetical' },
                      orderDirection: 'asc',
                      size: 10,
                      secondaryFields: ['myField'],
                    },
                  } as TermsIndexPatternColumn,
                },
              },
            },
          },
          layerId: 'first',
        });
        const data = {
          first: {
            type: 'datatable' as const,
            columns: [
              { id: 'col1', name: 'geo.src', meta: { type: 'string' as const } },
              { id: 'col2', name: 'geo.dest > myField', meta: { type: 'string' as const } },
            ],
            rows: [
              { col1: 'US', col2: { keys: ['IT', 'MyValue'] } },
              { col1: 'IN', col2: { keys: ['DE', 'MyOtherValue'] } },
            ],
          },
        };
        expect(publicAPI.getFilters(data)).toEqual({
          enabled: {
            kuery: [
              [
                { language: 'kuery', query: 'geo.src: "US"' },
                { language: 'kuery', query: 'geo.src: "IN"' },
              ],
              [
                { language: 'kuery', query: 'geo.dest: "IT" AND myField: "MyValue"' },
                { language: 'kuery', query: 'geo.dest: "DE" AND myField: "MyOtherValue"' },
              ],
            ],
            lucene: [],
          },
          disabled: { kuery: [], lucene: [] },
        });
      });
      it('shuold collect top values fields and terms and carefully handle empty string values', () => {
        publicAPI = indexPatternDatasource.getPublicAPI({
          state: {
            ...enrichBaseState(baseState),
            layers: {
              first: {
                indexPatternId: '1',
                columnOrder: ['col1', 'col2'],
                columns: {
                  col1: {
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
                  } as TermsIndexPatternColumn,
                  col2: {
                    label: 'Terms',
                    dataType: 'string',
                    isBucketed: true,
                    operationType: 'terms',
                    sourceField: 'geo.dest',
                    params: {
                      orderBy: { type: 'alphabetical' },
                      orderDirection: 'asc',
                      size: 10,
                      secondaryFields: ['myField'],
                    },
                  } as TermsIndexPatternColumn,
                },
              },
            },
          },
          layerId: 'first',
        });
        const data = {
          first: {
            type: 'datatable' as const,
            columns: [
              { id: 'col1', name: 'geo.src', meta: { type: 'string' as const } },
              { id: 'col2', name: 'geo.dest > myField', meta: { type: 'string' as const } },
            ],
            rows: [
              { col1: 'US', col2: { keys: ['IT', ''] } },
              { col1: 'IN', col2: { keys: ['DE', 'MyOtherValue'] } },
            ],
          },
        };
        expect(publicAPI.getFilters(data)).toEqual({
          enabled: {
            kuery: [
              [
                { language: 'kuery', query: 'geo.src: "US"' },
                { language: 'kuery', query: 'geo.src: "IN"' },
              ],
              [
                { language: 'kuery', query: `geo.dest: "IT" AND myField: ""` },
                { language: 'kuery', query: `geo.dest: "DE" AND myField: "MyOtherValue"` },
              ],
            ],
            lucene: [],
          },
          disabled: { kuery: [], lucene: [] },
        });
      });
      it('should ignore top values fields if other/missing option is enabled', () => {
        publicAPI = indexPatternDatasource.getPublicAPI({
          state: {
            ...enrichBaseState(baseState),
            layers: {
              first: {
                indexPatternId: '1',
                columnOrder: ['col1', 'col2'],
                columns: {
                  col1: {
                    label: 'Terms',
                    dataType: 'string',
                    isBucketed: true,
                    operationType: 'terms',
                    sourceField: 'geo.src',
                    params: {
                      orderBy: { type: 'alphabetical' },
                      orderDirection: 'asc',
                      size: 10,
                      otherBucket: true,
                    },
                  } as TermsIndexPatternColumn,
                  col2: {
                    label: 'Terms',
                    dataType: 'string',
                    isBucketed: true,
                    operationType: 'terms',
                    sourceField: 'geo.src',
                    params: {
                      orderBy: { type: 'alphabetical' },
                      orderDirection: 'asc',
                      size: 10,
                      missingBucket: true,
                    },
                  } as TermsIndexPatternColumn,
                },
              },
            },
          },
          layerId: 'first',
        });
        expect(publicAPI.getFilters()).toEqual({
          enabled: { kuery: [], lucene: [] },
          disabled: { kuery: [], lucene: [] },
        });
      });
      it('should collect custom ranges as kuery filters', () => {
        publicAPI = indexPatternDatasource.getPublicAPI({
          state: {
            ...enrichBaseState(baseState),
            layers: {
              first: {
                indexPatternId: '1',
                columnOrder: ['col1', 'col2'],
                columns: {
                  col1: {
                    label: 'Single range',
                    dataType: 'number',
                    isBucketed: true,
                    operationType: 'range',
                    sourceField: 'bytes',
                    params: {
                      type: 'range',
                      ranges: [{ from: 100, to: 150, label: 'Range 1' }],
                    },
                  } as RangeIndexPatternColumn,
                  col2: {
                    label: 'Multiple ranges',
                    dataType: 'number',
                    isBucketed: true,
                    operationType: 'range',
                    sourceField: 'bytes',
                    params: {
                      type: 'range',
                      ranges: [
                        { from: 200, to: 300, label: 'Range 2' },
                        { from: 300, to: 400, label: 'Range 3' },
                      ],
                    },
                  } as RangeIndexPatternColumn,
                },
              },
            },
          },
          layerId: 'first',
        });
        expect(publicAPI.getFilters()).toEqual({
          enabled: {
            kuery: [
              [{ language: 'kuery', query: 'bytes >= 100 AND bytes <= 150' }],
              [
                { language: 'kuery', query: 'bytes >= 200 AND bytes <= 300' },
                { language: 'kuery', query: 'bytes >= 300 AND bytes <= 400' },
              ],
            ],
            lucene: [],
          },
          disabled: { kuery: [], lucene: [] },
        });
      });
      it('should collect custom ranges as kuery filters as partial', () => {
        publicAPI = indexPatternDatasource.getPublicAPI({
          state: {
            ...enrichBaseState(baseState),
            layers: {
              first: {
                indexPatternId: '1',
                columnOrder: ['col1', 'col2', 'col3'],
                columns: {
                  col1: {
                    label: 'Empty range',
                    dataType: 'number',
                    isBucketed: true,
                    operationType: 'range',
                    sourceField: 'bytes',
                    params: {
                      type: 'range',
                      ranges: [{ label: 'Empty range' }],
                    },
                  } as RangeIndexPatternColumn,
                  col2: {
                    label: 'From range',
                    dataType: 'number',
                    isBucketed: true,
                    operationType: 'range',
                    sourceField: 'bytes',
                    params: {
                      type: 'range',
                      ranges: [{ from: 100, label: 'Partial range 1' }],
                    },
                  } as RangeIndexPatternColumn,
                  col3: {
                    label: 'To ranges',
                    dataType: 'number',
                    isBucketed: true,
                    operationType: 'range',
                    sourceField: 'bytes',
                    params: {
                      type: 'range',
                      ranges: [{ to: 300, label: 'Partial Range 2' }],
                    },
                  } as RangeIndexPatternColumn,
                },
              },
            },
          },
          layerId: 'first',
        });
        expect(publicAPI.getFilters()).toEqual({
          enabled: {
            kuery: [
              [{ language: 'kuery', query: 'bytes >= 100' }],
              [{ language: 'kuery', query: 'bytes <= 300' }],
            ],
            lucene: [],
          },
          disabled: { kuery: [], lucene: [] },
        });
      });
      it('should collect filters within filters operation grouped by language', () => {
        publicAPI = indexPatternDatasource.getPublicAPI({
          state: {
            ...enrichBaseState(baseState),
            layers: {
              first: {
                indexPatternId: '1',
                columnOrder: ['col1', 'col2', 'col3'],
                columns: {
                  col1: {
                    label: 'kuery Filter',
                    dataType: 'string',
                    isBucketed: true,
                    operationType: 'filters',
                    scale: 'ordinal',
                    params: {
                      filters: [{ label: '', input: { language: 'kuery', query: 'bytes > 1000' } }],
                    },
                  } as FiltersIndexPatternColumn,
                  col2: {
                    label: 'Lucene Filter',
                    dataType: 'string',
                    isBucketed: true,
                    operationType: 'filters',
                    scale: 'ordinal',
                    params: {
                      filters: [{ label: '', input: { language: 'lucene', query: 'memory' } }],
                    },
                  } as FiltersIndexPatternColumn,
                  col3: {
                    label: 'Mixed filters',
                    dataType: 'string',
                    isBucketed: true,
                    operationType: 'filters',
                    scale: 'ordinal',
                    params: {
                      filters: [
                        { label: '', input: { language: 'kuery', query: 'bytes > 5000' } },
                        { label: '', input: { language: 'kuery', query: 'memory > 500000' } },
                        { label: '', input: { language: 'lucene', query: 'phpmemory' } },
                        { label: '', input: { language: 'lucene', query: 'memory: 5000000' } },
                      ],
                    },
                  } as FiltersIndexPatternColumn,
                },
              },
            },
          },
          layerId: 'first',
        });
        expect(publicAPI.getFilters()).toEqual({
          enabled: {
            kuery: [
              [{ language: 'kuery', query: 'bytes > 1000' }],
              [
                { language: 'kuery', query: 'bytes > 5000' },
                { language: 'kuery', query: 'memory > 500000' },
              ],
            ],
            lucene: [
              [{ language: 'lucene', query: 'memory' }],
              [
                { language: 'lucene', query: 'phpmemory' },
                { language: 'lucene', query: 'memory: 5000000' },
              ],
            ],
          },
          disabled: { kuery: [], lucene: [] },
        });
      });
      it('should ignore filtered metrics if at least one metric is unfiltered', () => {
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
                    filter: { language: 'kuery', query: 'bytes > 1000' },
                  } as GenericIndexPatternColumn,
                  col2: {
                    label: 'Sum',
                    dataType: 'number',
                    isBucketed: false,
                    operationType: 'sum',
                    sourceField: 'test',
                    params: {},
                  } as GenericIndexPatternColumn,
                },
              },
            },
          },
          layerId: 'first',
        });
        expect(publicAPI.getFilters()).toEqual({
          enabled: { kuery: [], lucene: [] },
          disabled: { kuery: [[{ language: 'kuery', query: 'bytes > 1000' }]], lucene: [] },
        });
      });
      it('should ignore filtered metrics if at least one metric is unfiltered in formula', () => {
        publicAPI = indexPatternDatasource.getPublicAPI({
          state: {
            ...enrichBaseState(baseState),
            layers: {
              first: {
                indexPatternId: '1',
                columnOrder: ['formula'],
                columns: {
                  formula: {
                    label: 'Formula',
                    dataType: 'number',
                    operationType: 'formula',
                    isBucketed: false,
                    scale: 'ratio',
                    params: {
                      formula: "count(kql='memory > 5000') + count()",
                      isFormulaBroken: false,
                    },
                    references: ['math'],
                  } as FormulaIndexPatternColumn,
                  countX0: {
                    label: 'countX0',
                    dataType: 'number',
                    operationType: 'count',
                    isBucketed: false,
                    scale: 'ratio',
                    sourceField: '___records___',
                    customLabel: true,
                    filter: { language: 'kuery', query: 'memory > 5000' },
                  },
                  countX1: {
                    label: 'countX1',
                    dataType: 'number',
                    operationType: 'count',
                    isBucketed: false,
                    scale: 'ratio',
                    sourceField: '___records___',
                    customLabel: true,
                  },
                  math: {
                    label: 'math',
                    dataType: 'number',
                    operationType: 'math',
                    isBucketed: false,
                    scale: 'ratio',
                    params: {
                      tinymathAst: {
                        type: 'function',
                        name: 'add',
                        args: ['countX0', 'countX1'] as unknown as TinymathAST[],
                        location: {
                          min: 0,
                          max: 17,
                        },
                        text: "count(kql='memory > 5000') + count()",
                      },
                    },
                    references: ['countX0', 'countX1'],
                    customLabel: true,
                  } as MathIndexPatternColumn,
                },
              },
            },
          },
          layerId: 'first',
        });
        expect(publicAPI.getFilters()).toEqual({
          enabled: { kuery: [], lucene: [] },
          disabled: { kuery: [[{ language: 'kuery', query: 'memory > 5000' }]], lucene: [] },
        });
      });
      it('should support complete scenarios', () => {
        publicAPI = indexPatternDatasource.getPublicAPI({
          state: {
            ...enrichBaseState(baseState),
            layers: {
              first: {
                indexPatternId: '1',
                columnOrder: ['col1', 'col2', 'col3', 'col4'],
                columns: {
                  col1: {
                    label: 'Mixed filters',
                    dataType: 'string',
                    isBucketed: true,
                    operationType: 'filters',
                    scale: 'ordinal',
                    params: {
                      filters: [
                        { label: '', input: { language: 'kuery', query: 'bytes > 5000' } },
                        { label: '', input: { language: 'kuery', query: 'memory > 500000' } },
                        { label: '', input: { language: 'lucene', query: 'phpmemory' } },
                        { label: '', input: { language: 'lucene', query: 'memory: 5000000' } },
                      ],
                    },
                  } as FiltersIndexPatternColumn,
                  col2: {
                    label: 'Sum',
                    dataType: 'number',
                    isBucketed: false,
                    operationType: 'sum',
                    sourceField: 'test',
                    params: {},
                    filter: { language: 'kuery', query: 'bytes > 1000' },
                  } as GenericIndexPatternColumn,
                  col3: {
                    label: 'Sum',
                    dataType: 'number',
                    isBucketed: false,
                    operationType: 'sum',
                    sourceField: 'test',
                    params: {},
                    filter: { language: 'lucene', query: 'memory' },
                  } as GenericIndexPatternColumn,
                  col4: {
                    label: 'Terms',
                    dataType: 'string',
                    isBucketed: true,
                    operationType: 'terms',
                    sourceField: 'geo.src',
                    params: {
                      orderBy: { type: 'alphabetical' },
                      orderDirection: 'asc',
                      size: 10,
                      secondaryFields: ['myField'],
                    },
                  } as TermsIndexPatternColumn,
                },
              },
            },
          },
          layerId: 'first',
        });
        expect(publicAPI.getFilters()).toEqual({
          enabled: {
            kuery: [
              [{ language: 'kuery', query: 'bytes > 1000' }],
              [
                { language: 'kuery', query: 'bytes > 5000' },
                { language: 'kuery', query: 'memory > 500000' },
              ],
              [
                { language: 'kuery', query: 'geo.src: *' },
                { language: 'kuery', query: 'myField: *' },
              ],
            ],
            lucene: [
              [{ language: 'lucene', query: 'memory' }],
              [
                { language: 'lucene', query: 'phpmemory' },
                { language: 'lucene', query: 'memory: 5000000' },
              ],
            ],
          },
          disabled: { kuery: [], lucene: [] },
        });
      });

      it('should avoid duplicate filters when formula has a global filter', () => {
        publicAPI = indexPatternDatasource.getPublicAPI({
          state: {
            ...enrichBaseState(baseState),
            layers: {
              first: {
                indexPatternId: '1',
                columnOrder: ['formula'],
                columns: {
                  formula: {
                    label: 'Formula',
                    dataType: 'number',
                    operationType: 'formula',
                    isBucketed: false,
                    scale: 'ratio',
                    filter: { language: 'kuery', query: 'bytes > 4000' },
                    params: {
                      formula: "count(kql='memory > 5000') + count()",
                      isFormulaBroken: false,
                    },
                    references: ['math'],
                  } as FormulaIndexPatternColumn,
                  countX0: {
                    label: 'countX0',
                    dataType: 'number',
                    operationType: 'count',
                    isBucketed: false,
                    scale: 'ratio',
                    sourceField: '___records___',
                    customLabel: true,
                    filter: { language: 'kuery', query: 'bytes > 4000 AND memory > 5000' },
                  },
                  countX1: {
                    label: 'countX1',
                    dataType: 'number',
                    operationType: 'count',
                    isBucketed: false,
                    scale: 'ratio',
                    sourceField: '___records___',
                    customLabel: true,
                    filter: { language: 'kuery', query: 'bytes > 4000' },
                  },
                  math: {
                    label: 'math',
                    dataType: 'number',
                    operationType: 'math',
                    isBucketed: false,
                    scale: 'ratio',
                    params: {
                      tinymathAst: {
                        type: 'function',
                        name: 'add',
                        args: ['countX0', 'countX1'] as unknown as TinymathAST[],
                        location: {
                          min: 0,
                          max: 17,
                        },
                        text: "count(kql='memory > 5000') + count()",
                      },
                    },
                    references: ['countX0', 'countX1'],
                    customLabel: true,
                  } as MathIndexPatternColumn,
                },
              },
            },
          },
          layerId: 'first',
        });
        expect(publicAPI.getFilters()).toEqual({
          enabled: {
            kuery: [
              [
                { language: 'kuery', query: 'bytes > 4000 AND memory > 5000' },
                { language: 'kuery', query: 'bytes > 4000' },
              ],
            ],
            lucene: [],
          },
          disabled: { kuery: [], lucene: [] },
        });
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

  describe('#getWarningMessages', () => {
    let state: IndexPatternPrivateState;
    let framePublicAPI: FramePublicAPI;

    beforeEach(() => {
      state = {
        indexPatternRefs: [],
        existingFields: {},
        isFirstExistenceFetch: false,
        indexPatterns: expectedIndexPatterns,
        layers: {
          first: {
            indexPatternId: '1',
            columnOrder: ['col1', 'col2', 'col3', 'col4', 'col5', 'col6'],
            columns: {
              col1: {
                operationType: 'date_histogram',
                params: {
                  interval: '12h',
                },
                label: '',
                dataType: 'date',
                isBucketed: true,
                sourceField: 'timestamp',
              } as DateHistogramIndexPatternColumn,
              col2: {
                operationType: 'count',
                label: '',
                dataType: 'number',
                isBucketed: false,
                sourceField: 'records',
              },
              col3: {
                operationType: 'count',
                timeShift: '1h',
                label: '',
                dataType: 'number',
                isBucketed: false,
                sourceField: 'records',
              },
              col4: {
                operationType: 'count',
                timeShift: '13h',
                label: '',
                dataType: 'number',
                isBucketed: false,
                sourceField: 'records',
              },
              col5: {
                operationType: 'count',
                timeShift: '1w',
                label: '',
                dataType: 'number',
                isBucketed: false,
                sourceField: 'records',
              },
              col6: {
                operationType: 'count',
                timeShift: 'previous',
                label: '',
                dataType: 'number',
                isBucketed: false,
                sourceField: 'records',
              },
            },
          },
        },
        currentIndexPatternId: '1',
      };

      framePublicAPI = {
        activeData: {
          first: {
            type: 'datatable',
            rows: [],
            columns: [
              {
                id: 'col1',
                name: 'col1',
                meta: {
                  type: 'date',
                  source: 'esaggs',
                  sourceParams: {
                    type: 'date_histogram',
                    params: {
                      used_interval: '12h',
                    },
                  },
                },
              },
            ],
          },
        },
      } as unknown as FramePublicAPI;
    });

    it('should return mismatched time shifts', () => {
      const warnings = indexPatternDatasource.getWarningMessages!(state, framePublicAPI, () => {});

      expect(warnings!.map((item) => (item as React.ReactElement).props.id)).toMatchInlineSnapshot(`
        Array [
          "xpack.lens.indexPattern.timeShiftSmallWarning",
          "xpack.lens.indexPattern.timeShiftMultipleWarning",
        ]
      `);
    });

    it('should show different types of warning messages', () => {
      framePublicAPI.activeData!.first.columns[0].meta.sourceParams!.hasPrecisionError = true;

      const warnings = indexPatternDatasource.getWarningMessages!(state, framePublicAPI, () => {});

      expect(warnings!.map((item) => (item as React.ReactElement).props.id)).toMatchInlineSnapshot(`
        Array [
          "xpack.lens.indexPattern.timeShiftSmallWarning",
          "xpack.lens.indexPattern.timeShiftMultipleWarning",
          "xpack.lens.indexPattern.precisionErrorWarning",
        ]
      `);
    });

    it('should prepend each error with its layer number on multi-layer chart', () => {
      (getErrorMessages as jest.Mock).mockClear();
      (getErrorMessages as jest.Mock).mockReturnValueOnce(['error 1', 'error 2']);

      state = {
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
                    operationType: 'average',
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

    it('should clear all incomplete columns', () => {
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
              col1: { operationType: 'average' as const },
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
            incompleteColumns: undefined,
          },
        },
      });
    });
  });
  describe('#isTimeBased', () => {
    it('should return true if date histogram exists in any layer', () => {
      const state = enrichBaseState({
        currentIndexPatternId: '1',
        layers: {
          first: {
            indexPatternId: '1',
            columnOrder: ['metric'],
            columns: {
              metric: {
                label: 'Count of records2',
                dataType: 'number',
                isBucketed: false,
                sourceField: '___records___',
                operationType: 'count',
              },
            },
          },
          second: {
            indexPatternId: '1',
            columnOrder: ['bucket1', 'bucket2', 'metric2'],
            columns: {
              metric2: {
                label: 'Count of records',
                dataType: 'number',
                isBucketed: false,
                sourceField: '___records___',
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
              } as DateHistogramIndexPatternColumn,
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
              } as TermsIndexPatternColumn,
            },
          },
        },
      });
      expect(indexPatternDatasource.isTimeBased(state)).toEqual(true);
    });
    it('should return false if date histogram exists but is detached from global time range in every layer', () => {
      const state = enrichBaseState({
        currentIndexPatternId: '1',
        layers: {
          first: {
            indexPatternId: '1',
            columnOrder: ['metric'],
            columns: {
              metric: {
                label: 'Count of records2',
                dataType: 'number',
                isBucketed: false,
                sourceField: '___records___',
                operationType: 'count',
              },
            },
          },
          second: {
            indexPatternId: '1',
            columnOrder: ['bucket1', 'bucket2', 'metric2'],
            columns: {
              metric2: {
                label: 'Count of records',
                dataType: 'number',
                isBucketed: false,
                sourceField: '___records___',
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
                  ignoreTimeRange: true,
                },
              } as DateHistogramIndexPatternColumn,
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
              } as TermsIndexPatternColumn,
            },
          },
        },
      });
      expect(indexPatternDatasource.isTimeBased(state)).toEqual(false);
    });
    it('should return false if date histogram does not exist in any layer', () => {
      const state = enrichBaseState({
        currentIndexPatternId: '1',
        layers: {
          first: {
            indexPatternId: '1',
            columnOrder: ['metric'],
            columns: {
              metric: {
                label: 'Count of records',
                dataType: 'number',
                isBucketed: false,
                sourceField: '___records___',
                operationType: 'count',
              },
            },
          },
        },
      });
      expect(indexPatternDatasource.isTimeBased(state)).toEqual(false);
    });
  });

  describe('#initializeDimension', () => {
    it('should return the same state if no static value is passed', () => {
      const state = enrichBaseState({
        currentIndexPatternId: '1',
        layers: {
          first: {
            indexPatternId: '1',
            columnOrder: ['metric'],
            columns: {
              metric: {
                label: 'Count of records',
                dataType: 'number',
                isBucketed: false,
                sourceField: '___records___',
                operationType: 'count',
              },
            },
          },
        },
      });
      expect(
        indexPatternDatasource.initializeDimension!(state, 'first', {
          columnId: 'newStatic',
          groupId: 'a',
        })
      ).toBe(state);
    });

    it('should add a new static value column if a static value is passed', () => {
      const state = enrichBaseState({
        currentIndexPatternId: '1',
        layers: {
          first: {
            indexPatternId: '1',
            columnOrder: ['metric'],
            columns: {
              metric: {
                label: 'Count of records',
                dataType: 'number',
                isBucketed: false,
                sourceField: '___records___',
                operationType: 'count',
              },
            },
          },
        },
      });
      expect(
        indexPatternDatasource.initializeDimension!(state, 'first', {
          columnId: 'newStatic',
          groupId: 'a',
          staticValue: 0, // use a falsy value to check also this corner case
        })
      ).toEqual({
        ...state,
        layers: {
          ...state.layers,
          first: {
            ...state.layers.first,
            incompleteColumns: {},
            columnOrder: ['metric', 'newStatic'],
            columns: {
              ...state.layers.first.columns,
              newStatic: {
                dataType: 'number',
                isStaticValue: true,
                isBucketed: false,
                label: 'Static value: 0',
                operationType: 'static_value',
                params: { value: '0' },
                references: [],
                scale: 'ratio',
              },
            },
          },
        },
      });
    });
  });

  describe('#isEqual', () => {
    const layerId = '8bd66b66-aba3-49fb-9ff2-4bf83f2be08e';

    const persistableState: IndexPatternPersistedState = {
      layers: {
        [layerId]: {
          columns: {
            'fa649155-d7f5-49d9-af26-508287431244': {
              label: 'Count of records',
              dataType: 'number',
              operationType: 'count',
              isBucketed: false,
              scale: 'ratio',
              sourceField: '___records___',
            },
          },
          columnOrder: ['fa649155-d7f5-49d9-af26-508287431244'],
          incompleteColumns: {},
        },
      },
    };

    const currentIndexPatternReference = {
      id: 'some-id',
      name: 'indexpattern-datasource-current-indexpattern',
      type: 'index-pattern',
    };

    const references1: SavedObjectReference[] = [
      currentIndexPatternReference,
      {
        id: 'some-id',
        name: 'indexpattern-datasource-layer-8bd66b66-aba3-49fb-9ff2-4bf83f2be08e',
        type: 'index-pattern',
      },
    ];

    const references2: SavedObjectReference[] = [
      currentIndexPatternReference,
      {
        id: 'some-DIFFERENT-id',
        name: 'indexpattern-datasource-layer-8bd66b66-aba3-49fb-9ff2-4bf83f2be08e',
        type: 'index-pattern',
      },
    ];

    it('should be false if datasource states are using different data views', () => {
      expect(
        indexPatternDatasource.isEqual(persistableState, references1, persistableState, references2)
      ).toBe(false);
    });

    it('should be false if datasource states differ', () => {
      const differentPersistableState = cloneDeep(persistableState);
      differentPersistableState.layers[layerId].columnOrder = ['something else'];

      expect(
        indexPatternDatasource.isEqual(
          persistableState,
          references1,
          differentPersistableState,
          references1
        )
      ).toBe(false);
    });

    it('should be true if datasource states are identical and they refer to the same data view', () => {
      expect(
        indexPatternDatasource.isEqual(persistableState, references1, persistableState, references1)
      ).toBe(true);
    });
  });
});
