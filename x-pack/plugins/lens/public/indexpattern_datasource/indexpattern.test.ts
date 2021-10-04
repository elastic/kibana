/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import 'jest-canvas-mock';
import { IStorageWrapper } from 'src/plugins/kibana_utils/public';
import { getIndexPatternDatasource, IndexPatternColumn } from './indexpattern';
import { DatasourcePublicAPI, Operation, Datasource, FramePublicAPI } from '../types';
import { coreMock } from 'src/core/public/mocks';
import { IndexPatternPersistedState, IndexPatternPrivateState } from './types';
import { dataPluginMock } from '../../../../../src/plugins/data/public/mocks';
import { Ast } from '@kbn/interpreter/common';
import { chartPluginMock } from '../../../../../src/plugins/charts/public/mocks';
import { getFieldByNameFactory } from './pure_helpers';
import { operationDefinitionMap, getErrorMessages } from './operations';
import { createMockedFullReference } from './operations/mocks';
import { indexPatternFieldEditorPluginMock } from 'src/plugins/index_pattern_field_editor/public/mocks';
import { uiActionsPluginMock } from '../../../../../src/plugins/ui_actions/public/mocks';
import { fieldFormatsServiceMock } from '../../../../../src/plugins/field_formats/public/mocks';

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
      fieldFormats: fieldFormatsServiceMock.createStartContract(),
      charts: chartPluginMock.createSetupContract(),
      indexPatternFieldEditor: indexPatternFieldEditorPluginMock.createStartContract(),
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
      const queryBaseState: IndexPatternBaseState = {
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
                  "{\\"col-0-0\\":{\\"label\\":\\"Count of records\\",\\"dataType\\":\\"number\\",\\"isBucketed\\":false,\\"sourceField\\":\\"Records\\",\\"operationType\\":\\"count\\",\\"id\\":\\"col1\\"},\\"col-1-1\\":{\\"label\\":\\"Date\\",\\"dataType\\":\\"date\\",\\"isBucketed\\":true,\\"operationType\\":\\"date_histogram\\",\\"sourceField\\":\\"timestamp\\",\\"params\\":{\\"interval\\":\\"1d\\"},\\"id\\":\\"col2\\"}}",
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

    it('should pass time shift parameter to metric agg functions', async () => {
      const queryBaseState: IndexPatternBaseState = {
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
                sourceField: 'Records',
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
              },
            },
          },
        },
      };

      const state = enrichBaseState(queryBaseState);

      const ast = indexPatternDatasource.toExpression(state, 'first') as Ast;
      expect((ast.chain[0].arguments.aggs[1] as Ast).chain[0].arguments.timeShift).toEqual(['1d']);
    });

    it('should wrap filtered metrics in filtered metric aggregation', async () => {
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
              },
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

    it('should put column formatters after calculated columns', async () => {
      const queryBaseState: IndexPatternBaseState = {
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
              },
              metric: {
                label: 'Count of records',
                dataType: 'number',
                isBucketed: false,
                sourceField: 'Records',
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
              },
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
        'col-0-0': expect.objectContaining({ id: 'bucket1' }),
        'col-1-1': expect.objectContaining({ id: 'bucket2' }),
        'col-2-2': expect.objectContaining({ id: 'metric' }),
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
        operationDefinitionMap.testReference = createMockedFullReference();

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
                  operationType: 'unique_count',
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

      it('should keep correct column mapping keys with reference columns present', async () => {
        const queryBaseState: IndexPatternBaseState = {
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
        expect(JSON.parse(ast.chain[1].arguments.idMap[0] as string)).toEqual({
          'col-0-0': expect.objectContaining({
            id: 'col1',
          }),
        });
      });

      it('should topologically sort references', () => {
        // This is a real example of count() + count()
        const queryBaseState: IndexPatternBaseState = {
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
                  sourceField: 'Records',
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
                },
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
                },
                countX0: {
                  label: 'countX0',
                  dataType: 'number',
                  operationType: 'count',
                  isBucketed: false,
                  scale: 'ratio',
                  sourceField: 'Records',
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
                      // @ts-expect-error String args are not valid tinymath, but signals something unique to Lens
                      args: ['countX0', 'count'],
                      location: {
                        min: 0,
                        max: 17,
                      },
                      text: 'count() + count()',
                    },
                  },
                  references: ['countX0', 'count'],
                  customLabel: true,
                },
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

  describe('#getWarningMessages', () => {
    it('should return mismatched time shifts', () => {
      const state: IndexPatternPrivateState = {
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
              },
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
      const warnings = indexPatternDatasource.getWarningMessages!(state, {
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
      } as unknown as FramePublicAPI);
      expect(warnings!.length).toBe(2);
      expect((warnings![0] as React.ReactElement).props.id).toEqual(
        'xpack.lens.indexPattern.timeShiftSmallWarning'
      );
      expect((warnings![1] as React.ReactElement).props.id).toEqual(
        'xpack.lens.indexPattern.timeShiftMultipleWarning'
      );
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
                sourceField: 'Records',
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
      });
      expect(indexPatternDatasource.isTimeBased(state)).toEqual(true);
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
                sourceField: 'Records',
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
                sourceField: 'Records',
                operationType: 'count',
              },
            },
          },
        },
      });
      expect(
        indexPatternDatasource.initializeDimension!(state, 'first', {
          columnId: 'newStatic',
          label: 'MyNewColumn',
          groupId: 'a',
          dataType: 'number',
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
                sourceField: 'Records',
                operationType: 'count',
              },
            },
          },
        },
      });
      expect(
        indexPatternDatasource.initializeDimension!(state, 'first', {
          columnId: 'newStatic',
          label: 'MyNewColumn',
          groupId: 'a',
          dataType: 'number',
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
                isBucketed: false,
                label: 'Static value: 0',
                operationType: 'static_value',
                params: { value: 0 },
                references: [],
                scale: 'ratio',
              },
            },
          },
        },
      });
    });
  });
});
