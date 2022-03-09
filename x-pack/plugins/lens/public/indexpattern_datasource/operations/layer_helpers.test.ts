/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { OperationMetadata } from '../../types';
import {
  copyColumn,
  insertNewColumn,
  replaceColumn,
  updateColumnParam,
  getColumnOrder,
  deleteColumn,
  updateLayerIndexPattern,
  getErrorMessages,
  hasTermsWithManyBuckets,
  isReferenced,
  getReferenceRoot,
} from './layer_helpers';
import { operationDefinitionMap, OperationType } from '../operations';
import { TermsIndexPatternColumn } from './definitions/terms';
import { DateHistogramIndexPatternColumn } from './definitions/date_histogram';
import { AvgIndexPatternColumn } from './definitions/metrics';
import type { IndexPattern, IndexPatternLayer, IndexPatternPrivateState } from '../types';
import { documentField } from '../document_field';
import { getFieldByNameFactory } from '../pure_helpers';
import { generateId } from '../../id_generator';
import { createMockedFullReference, createMockedManagedReference } from './mocks';
import {
  FiltersIndexPatternColumn,
  FormulaIndexPatternColumn,
  GenericIndexPatternColumn,
  MathIndexPatternColumn,
  MovingAverageIndexPatternColumn,
  OperationDefinition,
} from './definitions';
import { TinymathAST } from 'packages/kbn-tinymath';
import { CoreStart } from 'kibana/public';

jest.mock('../operations');
jest.mock('../../id_generator');

const indexPatternFields = [
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
  documentField,
];

const indexPattern = {
  id: '1',
  title: 'my-fake-index-pattern',
  timeFieldName: 'timestamp',
  hasRestrictions: false,
  fields: indexPatternFields,
  getFieldByName: getFieldByNameFactory([...indexPatternFields, documentField]),
};

describe('state_helpers', () => {
  beforeEach(() => {
    let count = 0;
    (generateId as jest.Mock).mockImplementation(() => `id${++count}`);

    // @ts-expect-error we are inserting an invalid type
    operationDefinitionMap.testReference = createMockedFullReference();
    // @ts-expect-error we are inserting an invalid type
    operationDefinitionMap.managedReference = createMockedManagedReference();
  });

  afterEach(() => {
    delete operationDefinitionMap.testReference;
    delete operationDefinitionMap.managedReference;
  });

  describe('copyColumn', () => {
    it('should recursively modify a formula and update the math ast', () => {
      const source = {
        dataType: 'number' as const,
        isBucketed: false,
        label: '5 + moving_average(sum(bytes), window=5)',
        operationType: 'formula' as const,
        params: {
          formula: '5 + moving_average(sum(bytes), window=5)',
          isFormulaBroken: false,
        },
        references: ['formulaX2'],
      };
      const math = {
        customLabel: true,
        dataType: 'number' as const,
        isBucketed: false,
        operationType: 'math' as const,
        label: 'Part of 5 + moving_average(sum(bytes), window=5)',
        references: ['formulaX1'],
        params: {
          tinymathAst: {
            type: 'function',
            name: 'add',
            args: [5, 'formulaX1'],
          } as TinymathAST,
        },
      };
      const sum = {
        customLabel: true,
        dataType: 'number' as const,
        isBucketed: false,
        label: 'Part of 5 + moving_average(sum(bytes), window=5)',
        operationType: 'sum' as const,
        scale: 'ratio' as const,
        sourceField: 'bytes',
      };
      const movingAvg = {
        customLabel: true,
        dataType: 'number' as const,
        isBucketed: false,
        label: 'Part of 5 + moving_average(sum(bytes), window=5)',
        operationType: 'moving_average' as const,
        params: { window: 5 },
        references: ['formulaX0'],
      };
      expect(
        copyColumn({
          layer: {
            indexPatternId: '',
            columnOrder: [],
            columns: {
              source,
              formulaX0: sum,
              formulaX1: movingAvg,
              formulaX2: math,
            },
          },
          targetId: 'copy',
          sourceColumn: source,
          shouldDeleteSource: false,
          indexPattern,
          sourceColumnId: 'source',
        })
      ).toEqual({
        indexPatternId: '',
        columnOrder: [
          'source',
          'formulaX0',
          'formulaX1',
          'formulaX2',
          'copyX0',
          'copyX1',
          'copyX2',
          'copy',
        ],
        columns: {
          source,
          formulaX0: sum,
          formulaX1: movingAvg,
          formulaX2: math,
          copy: expect.objectContaining({ ...source, references: ['copyX2'] }),
          copyX0: expect.objectContaining({
            ...sum,
          }),
          copyX1: expect.objectContaining({
            ...movingAvg,
            references: ['copyX0'],
          }),
          copyX2: expect.objectContaining({
            ...math,
            references: ['copyX1'],
            params: {
              tinymathAst: expect.objectContaining({
                type: 'function',
                name: 'add',
                args: [5, 'copyX1'],
              } as TinymathAST),
            },
          }),
        },
      });
    });
  });

  describe('insertNewColumn', () => {
    it('should throw for invalid operations', () => {
      expect(() => {
        insertNewColumn({
          layer: { indexPatternId: '', columns: {}, columnOrder: [] },
          indexPattern,
          op: 'missing' as OperationType,
          columnId: 'none',
          visualizationGroups: [],
        });
      }).toThrow();
    });

    it('should update order on inserting a bucketed fieldless operation', () => {
      const layer: IndexPatternLayer = {
        indexPatternId: '1',
        columnOrder: ['col1'],
        columns: {
          col1: {
            label: 'Average of bytes',
            dataType: 'number',
            isBucketed: false,

            // Private
            operationType: 'average',
            sourceField: 'bytes',
          },
        },
      };
      expect(
        insertNewColumn({
          layer,
          indexPattern,
          columnId: 'col2',
          op: 'filters',
          visualizationGroups: [],
        })
      ).toEqual(expect.objectContaining({ columnOrder: ['col2', 'col1'] }));
    });

    it('should update order on inserting a bucketed field-based operation', () => {
      const layer: IndexPatternLayer = {
        indexPatternId: '1',
        columnOrder: ['col1'],
        columns: {
          col1: {
            label: 'Average of bytes',
            dataType: 'number',
            isBucketed: false,

            // Private
            operationType: 'average',
            sourceField: 'bytes',
          },
        },
      };
      expect(
        insertNewColumn({
          layer,
          indexPattern,
          columnId: 'col2',
          op: 'date_histogram',
          field: indexPattern.fields[0],
          visualizationGroups: [],
        })
      ).toEqual(expect.objectContaining({ columnOrder: ['col2', 'col1'] }));
    });

    it('should insert a metric after buckets', () => {
      const layer: IndexPatternLayer = {
        indexPatternId: '1',
        columnOrder: ['col1'],
        columns: {
          col1: {
            label: 'Date histogram of timestamp',
            dataType: 'date',
            isBucketed: true,

            // Private
            operationType: 'date_histogram',
            sourceField: 'timestamp',
            params: {
              interval: 'h',
            },
          } as DateHistogramIndexPatternColumn,
        },
      };
      expect(
        insertNewColumn({
          layer,
          indexPattern,
          columnId: 'col2',
          op: 'count',
          field: documentField,
          visualizationGroups: [],
        })
      ).toEqual(expect.objectContaining({ columnOrder: ['col1', 'col2'] }));
    });

    it('should insert a metric after references', () => {
      const layer: IndexPatternLayer = {
        indexPatternId: '1',
        columnOrder: ['col1'],
        columns: {
          col1: {
            label: 'Date histogram of timestamp',
            dataType: 'date',
            isBucketed: true,

            // Private
            operationType: 'date_histogram',
            sourceField: 'timestamp',
            params: {
              interval: 'h',
            },
          } as DateHistogramIndexPatternColumn,
          col3: {
            label: 'Reference',
            dataType: 'number',
            isBucketed: false,

            operationType: 'cumulative_sum',
            references: ['col2'],
          },
        },
      };
      expect(
        insertNewColumn({
          layer,
          indexPattern,
          columnId: 'col2',
          op: 'count',
          field: documentField,
          visualizationGroups: [],
        })
      ).toEqual(expect.objectContaining({ columnOrder: ['col1', 'col3', 'col2'] }));
    });

    it('should insert new buckets at the end of previous buckets', () => {
      const layer: IndexPatternLayer = {
        indexPatternId: '1',
        columnOrder: ['col1', 'col3'],
        columns: {
          col1: {
            label: 'Date histogram of timestamp',
            dataType: 'date',
            isBucketed: true,

            // Private
            operationType: 'date_histogram',
            sourceField: 'timestamp',
            params: {
              interval: 'h',
            },
          } as DateHistogramIndexPatternColumn,
          col3: {
            label: 'Count of records',
            dataType: 'document',
            isBucketed: false,

            // Private
            operationType: 'count',
            sourceField: '___records___',
          },
        },
      };
      expect(
        insertNewColumn({
          layer,
          indexPattern,
          columnId: 'col2',
          op: 'filters',
          visualizationGroups: [],
        })
      ).toEqual(expect.objectContaining({ columnOrder: ['col1', 'col2', 'col3'] }));
    });

    it('should not change order of metrics and references on inserting new buckets', () => {
      const layer: IndexPatternLayer = {
        indexPatternId: '1',
        columnOrder: ['col1', 'col2'],
        columns: {
          col1: {
            label: 'Cumulative sum of count of records',
            dataType: 'number',
            isBucketed: false,

            // Private
            operationType: 'cumulative_sum',
            references: ['col2'],
          },
          col2: {
            label: 'Count of records',
            dataType: 'document',
            isBucketed: false,

            // Private
            operationType: 'count',
            sourceField: '___records___',
          },
        },
      };
      expect(
        insertNewColumn({
          layer,
          indexPattern,
          columnId: 'col3',
          op: 'filters',
          visualizationGroups: [],
        })
      ).toEqual(expect.objectContaining({ columnOrder: ['col3', 'col1', 'col2'] }));
    });

    it('should insert both incomplete states if the aggregation does not support the field', () => {
      expect(
        insertNewColumn({
          layer: { indexPatternId: '1', columnOrder: [], columns: {} },
          columnId: 'col1',
          indexPattern,
          op: 'terms',
          field: indexPattern.fields[0],
          visualizationGroups: [],
        })
      ).toEqual(
        expect.objectContaining({
          incompleteColumns: {
            col1: { operationType: 'terms', sourceField: 'timestamp' },
          },
        })
      );
    });

    it('should put the terms agg ahead of the date histogram', () => {
      expect(
        insertNewColumn({
          layer: {
            indexPatternId: '1',
            columnOrder: ['col1'],
            columns: {
              col1: {
                label: 'Date histogram of timestamp',
                dataType: 'date',
                isBucketed: true,

                // Private
                operationType: 'date_histogram',
                sourceField: 'timestamp',
                params: {
                  interval: 'h',
                },
              } as DateHistogramIndexPatternColumn,
            },
          },
          columnId: 'col2',
          indexPattern,
          op: 'terms',
          field: indexPattern.fields[2],
          visualizationGroups: [],
        })
      ).toEqual(expect.objectContaining({ columnOrder: ['col2', 'col1'] }));
    });

    it('should allow two date histograms', () => {
      expect(
        insertNewColumn({
          layer: {
            indexPatternId: '1',
            columnOrder: ['col1'],
            columns: {
              col1: {
                label: 'Date histogram of timestamp',
                dataType: 'date',
                isBucketed: true,

                // Private
                operationType: 'date_histogram',
                sourceField: 'timestamp',
                params: {
                  interval: 'h',
                },
              } as DateHistogramIndexPatternColumn,
            },
          },
          columnId: 'col2',
          indexPattern,
          op: 'date_histogram',
          field: indexPattern.fields[0],
          visualizationGroups: [],
        })
      ).toEqual(expect.objectContaining({ columnOrder: ['col1', 'col2'] }));
    });

    it('should call onOtherColumn changed on existing columns', () => {
      expect(
        insertNewColumn({
          layer: {
            indexPatternId: '1',
            columnOrder: ['col1'],
            columns: {
              col1: {
                label: 'Top values of source',
                dataType: 'string',
                isBucketed: true,

                // Private
                operationType: 'terms',
                sourceField: 'source',
                params: {
                  orderBy: { type: 'alphabetical', fallback: true },
                  orderDirection: 'asc',
                  size: 5,
                },
              } as TermsIndexPatternColumn,
            },
          },
          columnId: 'col2',
          indexPattern,
          op: 'sum',
          field: indexPattern.fields[2],
          visualizationGroups: [],
        })
      ).toEqual(
        expect.objectContaining({
          columns: expect.objectContaining({
            col1: expect.objectContaining({
              params: {
                orderBy: { columnId: 'col2', type: 'column' },
                orderDirection: 'desc',
                size: 5,
              },
            }),
          }),
        })
      );
    });

    it('should allow multiple metrics', () => {
      expect(
        insertNewColumn({
          layer: {
            indexPatternId: '1',
            columnOrder: ['col1', 'col2'],
            columns: {
              col1: {
                label: 'Average of bytes',
                dataType: 'number',
                isBucketed: false,

                // Private
                operationType: 'average',
                sourceField: 'bytes',
              },
              col2: {
                label: 'Count of records',
                dataType: 'document',
                isBucketed: false,

                // Private
                operationType: 'count',
                sourceField: '___records___',
              },
            },
          },
          columnId: 'col3',
          indexPattern,
          op: 'sum',
          field: indexPattern.fields[2],
          visualizationGroups: [],
        })
      ).toEqual(expect.objectContaining({ columnOrder: ['col1', 'col2', 'col3'] }));
    });

    it('should inherit filters from the incomplete column when passed', () => {
      expect(
        insertNewColumn({
          layer: {
            indexPatternId: '1',
            columnOrder: ['col1'],
            columns: {
              col1: {
                label: 'Date histogram of timestamp',
                dataType: 'date',
                isBucketed: true,

                // Private
                operationType: 'date_histogram',
                sourceField: 'timestamp',
                params: {
                  interval: 'h',
                },
              } as DateHistogramIndexPatternColumn,
            },
          },
          columnId: 'col2',
          indexPattern,
          op: 'average',
          field: indexPattern.fields[2],
          visualizationGroups: [],
          incompleteParams: { filter: { language: 'kuery', query: '' }, timeShift: '3d' },
        })
      ).toEqual(
        expect.objectContaining({
          columns: expect.objectContaining({
            col2: expect.objectContaining({
              filter: { language: 'kuery', query: '' },
              timeShift: '3d',
            }),
          }),
        })
      );
    });

    describe('inserting a new reference', () => {
      it('should throw if the required references are impossible to match', () => {
        // @ts-expect-error this function is not valid
        operationDefinitionMap.testReference.requiredReferences = [
          {
            input: ['none', 'field'],
            validateMetadata: () => false,
            specificOperations: [],
          },
        ];
        const layer: IndexPatternLayer = { indexPatternId: '1', columnOrder: [], columns: {} };
        expect(() => {
          insertNewColumn({
            layer,
            indexPattern,
            columnId: 'col2',
            op: 'testReference' as OperationType,
            visualizationGroups: [],
          });
        }).toThrow();
      });

      it('should leave the references empty if too ambiguous', () => {
        const layer: IndexPatternLayer = { indexPatternId: '1', columnOrder: [], columns: {} };
        const result = insertNewColumn({
          layer,
          indexPattern,
          columnId: 'col2',
          op: 'testReference' as OperationType,
          visualizationGroups: [],
        });

        expect(operationDefinitionMap.testReference.buildColumn).toHaveBeenCalledWith(
          expect.objectContaining({
            referenceIds: ['id1'],
          })
        );
        expect(result).toEqual(
          expect.objectContaining({
            columns: {
              col2: expect.objectContaining({ references: ['id1'] }),
            },
          })
        );
      });

      it('should create an operation if there is exactly one possible match', () => {
        // There is only one operation with `none` as the input type
        // @ts-expect-error this function is not valid
        operationDefinitionMap.testReference.requiredReferences = [
          {
            input: ['none'],
            validateMetadata: () => true,
          },
        ];
        const layer: IndexPatternLayer = { indexPatternId: '1', columnOrder: [], columns: {} };
        const result = insertNewColumn({
          layer,
          indexPattern,
          columnId: 'col1',
          op: 'testReference',
          visualizationGroups: [],
        });
        expect(result.columnOrder).toEqual(['id1', 'col1']);
        expect(result.columns).toEqual(
          expect.objectContaining({
            id1: expect.objectContaining({ operationType: 'filters' }),
            col1: expect.objectContaining({ references: ['id1'] }),
          })
        );
      });

      it('should create a referenced column if the ID is being used as a reference', () => {
        const layer: IndexPatternLayer = {
          indexPatternId: '1',
          columnOrder: ['col1'],
          columns: {
            col1: {
              dataType: 'number',
              isBucketed: false,
              label: '',

              operationType: 'testReference',
              references: ['ref1'],
            },
          },
        };
        expect(
          insertNewColumn({
            layer,
            indexPattern,
            columnId: 'ref1',
            op: 'count',
            field: documentField,
            visualizationGroups: [],
          })
        ).toEqual(
          expect.objectContaining({
            columns: {
              col1: expect.objectContaining({ references: ['ref1'] }),
              ref1: expect.objectContaining({}),
            },
          })
        );
      });
    });

    it('should not carry over a label if shouldResetLabel is set', () => {
      expect(
        insertNewColumn({
          layer: {
            indexPatternId: '1',
            columnOrder: ['col1'],
            columns: {
              col1: {
                label: 'Date histogram of timestamp',
                dataType: 'date',
                isBucketed: true,

                // Private
                operationType: 'date_histogram',
                sourceField: 'timestamp',
                params: {
                  interval: 'h',
                },
              } as DateHistogramIndexPatternColumn,
            },
          },
          columnId: 'col2',
          indexPattern,
          op: 'terms',
          field: indexPattern.fields[2],
          visualizationGroups: [],
          shouldResetLabel: true,
        }).columns.col2
      ).toEqual(
        expect.objectContaining({
          label: 'Top values of bytes',
        })
      );
    });
  });

  describe('replaceColumn', () => {
    it('should throw if there is no previous column', () => {
      expect(() => {
        replaceColumn({
          layer: { indexPatternId: '', columns: {}, columnOrder: [] },
          indexPattern,
          op: 'count',
          field: documentField,
          columnId: 'none',
          visualizationGroups: [],
        });
      }).toThrow();
    });

    it('should throw for invalid operations', () => {
      expect(() => {
        replaceColumn({
          layer: { indexPatternId: '', columns: {}, columnOrder: [] },
          indexPattern,
          op: 'missing' as OperationType,
          columnId: 'none',
          visualizationGroups: [],
        });
      }).toThrow();
    });

    it('should update order on changing the column', () => {
      const layer: IndexPatternLayer = {
        indexPatternId: '1',
        columnOrder: ['col1', 'col2'],
        columns: {
          col1: {
            label: 'Average of bytes',
            dataType: 'number',
            isBucketed: false,

            // Private
            operationType: 'average',
            sourceField: 'bytes',
          },
          col2: {
            label: 'Max of bytes',
            dataType: 'number',
            isBucketed: false,

            // Private
            operationType: 'max',
            sourceField: 'bytes',
          },
        },
      };
      expect(
        replaceColumn({
          layer,
          indexPattern,
          columnId: 'col2',
          op: 'date_histogram',
          field: indexPattern.fields[0], // date
          visualizationGroups: [],
        })
      ).toEqual(
        expect.objectContaining({
          columnOrder: ['col2', 'col1'],
        })
      );
    });

    it('should throw if nothing is changing', () => {
      expect(() => {
        replaceColumn({
          layer: {
            indexPatternId: '1',
            columnOrder: ['col1'],
            columns: {
              col1: {
                label: 'Date histogram of timestamp',
                dataType: 'date',
                isBucketed: true,

                // Private
                operationType: 'date_histogram',
                sourceField: 'timestamp',
                params: {
                  interval: 'h',
                },
              } as DateHistogramIndexPatternColumn,
            },
          },
          columnId: 'col1',
          indexPattern,
          op: 'date_histogram',
          field: indexPattern.fields[0],
          visualizationGroups: [],
        });
      }).toThrow();
    });

    it('should set incompleteColumns when switching to a field-based operation without providing a field', () => {
      expect(
        replaceColumn({
          layer: {
            indexPatternId: '1',
            columnOrder: ['col1'],
            columns: {
              col1: {
                label: 'Date histogram of timestamp',
                dataType: 'date',
                isBucketed: true,

                // Private
                operationType: 'date_histogram',
                sourceField: 'timestamp',
                params: {
                  interval: 'h',
                },
              } as DateHistogramIndexPatternColumn,
            },
          },
          columnId: 'col1',
          indexPattern,
          op: 'terms',
          visualizationGroups: [],
        })
      ).toEqual(
        expect.objectContaining({
          columns: { col1: expect.objectContaining({ operationType: 'date_histogram' }) },
          incompleteColumns: {
            col1: { operationType: 'terms' },
          },
        })
      );
    });

    it('should carry over params from old column if switching fields', () => {
      expect(
        replaceColumn({
          layer: {
            indexPatternId: '1',
            columnOrder: ['col1'],
            columns: {
              col1: {
                label: 'Date histogram of timestamp',
                dataType: 'date',
                isBucketed: true,

                // Private
                operationType: 'date_histogram',
                sourceField: 'timestamp',
                params: {
                  interval: 'h',
                },
              } as DateHistogramIndexPatternColumn,
            },
          },
          columnId: 'col1',
          indexPattern,
          op: 'date_histogram',
          field: indexPattern.fields[1],
          visualizationGroups: [],
        }).columns.col1
      ).toEqual(
        expect.objectContaining({
          params: { interval: 'h' },
        })
      );
    });

    it('should transition from field-based to fieldless operation, clearing incomplete', () => {
      expect(
        replaceColumn({
          layer: {
            indexPatternId: '1',
            columnOrder: ['col1'],
            columns: {
              col1: {
                label: 'Date histogram of timestamp',
                dataType: 'date',
                isBucketed: true,

                // Private
                operationType: 'date_histogram',
                sourceField: 'timestamp',
                params: {
                  interval: 'h',
                },
              } as DateHistogramIndexPatternColumn,
            },
            incompleteColumns: {
              col1: { operationType: 'terms' },
            },
          },
          indexPattern,
          columnId: 'col1',
          op: 'filters',
          visualizationGroups: [],
        })
      ).toEqual(
        expect.objectContaining({
          columns: {
            col1: expect.objectContaining({ operationType: 'filters' }),
          },
          incompleteColumns: {},
        })
      );
    });

    it('should transition from fieldless to field-based operation', () => {
      expect(
        replaceColumn({
          layer: {
            indexPatternId: '1',
            columnOrder: ['col1'],
            columns: {
              col1: {
                label: 'Filters',
                dataType: 'string',
                isBucketed: true,

                // Private
                operationType: 'filters',
                params: {
                  filters: [],
                },
              } as FiltersIndexPatternColumn,
            },
          },
          indexPattern,
          columnId: 'col1',
          op: 'date_histogram',
          field: indexPattern.fields[0],
          visualizationGroups: [],
        }).columns.col1
      ).toEqual(
        expect.objectContaining({
          operationType: 'date_histogram',
        })
      );
    });

    describe('labels', () => {
      it('should carry over label on field switch when customLabel flag on previousColumn is set', () => {
        expect(
          replaceColumn({
            layer: {
              indexPatternId: '1',
              columnOrder: ['col1'],
              columns: {
                col1: {
                  label: 'My custom label',
                  customLabel: true,
                  dataType: 'date',
                  isBucketed: true,

                  // Private
                  operationType: 'date_histogram',
                  sourceField: 'timestamp',
                  params: {
                    interval: 'h',
                  },
                } as DateHistogramIndexPatternColumn,
              },
            },
            indexPattern,
            columnId: 'col1',
            op: 'date_histogram',
            field: indexPattern.fields[1],
            visualizationGroups: [],
          }).columns.col1
        ).toEqual(
          expect.objectContaining({
            label: 'My custom label',
            customLabel: true,
          })
        );
      });

      it('should not carry over label when operation and field change at the same time', () => {
        expect(
          replaceColumn({
            layer: {
              indexPatternId: '1',
              columnOrder: ['col1'],
              columns: {
                col1: {
                  label: 'My custom label',
                  customLabel: true,
                  dataType: 'date',
                  isBucketed: true,

                  // Private
                  operationType: 'date_histogram',
                  sourceField: 'timestamp',
                  params: {
                    interval: 'h',
                  },
                } as DateHistogramIndexPatternColumn,
              },
            },
            indexPattern,
            columnId: 'col1',
            op: 'terms',
            field: indexPattern.fields[4],
            visualizationGroups: [],
          }).columns.col1
        ).toEqual(
          expect.objectContaining({
            label: 'Top values of source',
          })
        );
      });

      it('should carry over label on operation switch when customLabel flag on previousColumn is set', () => {
        expect(
          replaceColumn({
            layer: {
              indexPatternId: '1',
              columnOrder: ['col1'],
              columns: {
                col1: {
                  label: 'My custom label',
                  customLabel: true,
                  dataType: 'date',
                  isBucketed: true,

                  // Private
                  operationType: 'date_histogram',
                  sourceField: 'timestamp',
                  params: {
                    interval: 'h',
                  },
                } as DateHistogramIndexPatternColumn,
              },
            },
            indexPattern,
            columnId: 'col1',
            op: 'terms',
            field: indexPattern.fields[0],
            visualizationGroups: [],
          }).columns.col1
        ).toEqual(
          expect.objectContaining({
            label: 'My custom label',
            customLabel: true,
          })
        );
      });

      it('should not carry over a label if shouldResetLabel is set', () => {
        expect(
          replaceColumn({
            layer: {
              indexPatternId: '1',
              columnOrder: ['col1', 'col2'],
              columns: {
                col1: {
                  label: 'Top values of source',
                  dataType: 'string',
                  isBucketed: true,
                  operationType: 'terms',
                  sourceField: 'source',
                  params: {
                    orderBy: { type: 'alphabetical' },
                    orderDirection: 'asc',
                    size: 5,
                  },
                } as TermsIndexPatternColumn,
              },
            },
            indexPattern,
            columnId: 'col1',
            op: 'average',
            field: indexPattern.fields[2], // bytes field
            visualizationGroups: [],
            shouldResetLabel: true,
          }).columns.col1
        ).toEqual(expect.objectContaining({ label: 'Average of bytes' }));
      });

      it('should carry over a custom label when transitioning to a managed reference', () => {
        expect(
          replaceColumn({
            layer: {
              indexPatternId: '1',
              columnOrder: ['col1', 'col2'],
              columns: {
                col1: {
                  label: 'MY CUSTOM LABEL',
                  customLabel: true,
                  dataType: 'string',
                  isBucketed: true,
                  operationType: 'terms',
                  sourceField: 'source',
                  params: {
                    orderBy: { type: 'alphabetical' },
                    orderDirection: 'asc',
                    size: 5,
                  },
                } as TermsIndexPatternColumn,
              },
            },
            indexPattern,
            columnId: 'col1',
            op: 'formula',
            field: indexPattern.fields[2], // bytes field
            visualizationGroups: [],
            shouldResetLabel: undefined,
          }).columns.col1
        ).toEqual(expect.objectContaining({ label: 'MY CUSTOM LABEL' }));
      });

      it('should overwrite the current label when transitioning to a managed reference operation when not custom', () => {
        expect(
          replaceColumn({
            layer: {
              indexPatternId: '1',
              columnOrder: ['col1', 'col2'],
              columns: {
                col1: {
                  label: 'Average of bytes',
                  dataType: 'number',
                  isBucketed: false,
                  operationType: 'average',
                  sourceField: 'bytes',
                },
              },
            },
            indexPattern,
            columnId: 'col1',
            op: 'formula',
            field: indexPattern.fields[2], // bytes field
            visualizationGroups: [],
            shouldResetLabel: undefined,
          }).columns.col1
        ).toEqual(expect.objectContaining({ label: 'average(bytes)' }));
      });

      it('should carry over a custom label when transitioning from a managed reference', () => {
        expect(
          replaceColumn({
            layer: {
              indexPatternId: '1',
              columnOrder: ['col1', 'col2'],
              columns: {
                col1: {
                  label: 'MY CUSTOM LABEL',
                  customLabel: true,
                  dataType: 'number',
                  operationType: 'formula',
                  isBucketed: false,
                  scale: 'ratio',
                  params: { isFormulaBroken: false, formula: 'average(bytes)' },
                  references: [],
                } as FormulaIndexPatternColumn,
              },
            },
            indexPattern,
            columnId: 'col1',
            op: 'average',
            field: indexPattern.fields[2], // bytes field
            visualizationGroups: [],
            shouldResetLabel: undefined,
          }).columns.col1
        ).toEqual(expect.objectContaining({ label: 'MY CUSTOM LABEL' }));
      });

      it('should not carry over the managed reference default label to the new operation', () => {
        expect(
          replaceColumn({
            layer: {
              indexPatternId: '1',
              columnOrder: ['col1', 'col2'],
              columns: {
                col1: {
                  label: 'average(bytes)',
                  customLabel: true,
                  dataType: 'number',
                  operationType: 'formula',
                  isBucketed: false,
                  scale: 'ratio',
                  params: { isFormulaBroken: false, formula: 'average(bytes)' },
                  references: [],
                } as FormulaIndexPatternColumn,
              },
            },
            indexPattern,
            columnId: 'col1',
            op: 'average',
            field: indexPattern.fields[2], // bytes field
            visualizationGroups: [],
            shouldResetLabel: undefined,
          }).columns.col1
        ).toEqual(expect.objectContaining({ label: 'Average of bytes' }));
      });
    });

    it('should execute adjustments for other columns', () => {
      const termsColumn: TermsIndexPatternColumn = {
        label: 'Top values of source',
        dataType: 'string',
        isBucketed: true,

        // Private
        operationType: 'terms',
        sourceField: 'source',
        params: {
          orderBy: { type: 'alphabetical' },
          orderDirection: 'asc',
          size: 5,
        },
      };

      replaceColumn({
        layer: {
          indexPatternId: '1',
          columnOrder: ['col1', 'col2'],
          columns: {
            col1: termsColumn,
            col2: {
              label: 'Count',
              dataType: 'number',
              isBucketed: false,
              sourceField: '___records___',
              operationType: 'count',
            },
          },
        },
        indexPattern,
        columnId: 'col2',
        op: 'average',
        field: indexPattern.fields[2], // bytes field
        visualizationGroups: [],
      });

      expect(operationDefinitionMap.terms.onOtherColumnChanged).toHaveBeenCalledWith(
        {
          indexPatternId: '1',
          columnOrder: ['col1', 'col2'],
          columns: {
            col1: termsColumn,
            col2: expect.objectContaining({
              label: 'Average of bytes',
              dataType: 'number',
              isBucketed: false,
              sourceField: 'bytes',
              operationType: 'average',
            }),
          },
          incompleteColumns: {},
        },
        'col1',
        'col2'
      );
    });

    it('should execute adjustments for other columns when creating a reference', () => {
      const termsColumn: TermsIndexPatternColumn = {
        label: 'Top values of source',
        dataType: 'string',
        isBucketed: true,

        // Private
        operationType: 'terms',
        sourceField: 'source',
        params: {
          orderBy: { type: 'column', columnId: 'willBeReference' },
          orderDirection: 'desc',
          size: 5,
        },
      };

      replaceColumn({
        layer: {
          indexPatternId: '1',
          columnOrder: ['col1', 'willBeReference'],
          columns: {
            col1: termsColumn,
            willBeReference: {
              label: 'Count of records',
              dataType: 'number',
              isBucketed: false,
              sourceField: '___records___',
              operationType: 'count',
            },
          },
        },
        indexPattern,
        columnId: 'willBeReference',
        op: 'cumulative_sum',
        visualizationGroups: [],
      });

      expect(operationDefinitionMap.terms.onOtherColumnChanged).toHaveBeenCalledWith(
        expect.objectContaining({
          columns: {
            col1: {
              ...termsColumn,
              params: {
                orderBy: { type: 'alphabetical', fallback: true },
                orderDirection: 'asc',
                size: 5,
              },
            },
            id1: expect.objectContaining({
              dataType: 'number',
              isBucketed: false,
              sourceField: '___records___',
              operationType: 'count',
            }),
            willBeReference: expect.objectContaining({
              dataType: 'number',
              isBucketed: false,
              operationType: 'cumulative_sum',
            }),
          },
          incompleteColumns: {},
        }),
        'col1',
        'willBeReference'
      );
    });

    it('should combine multiple partial params if the column supports multiple fields', () => {
      const termsColumn: TermsIndexPatternColumn = {
        label: 'Top values of source',
        dataType: 'string',
        isBucketed: true,

        // Private
        operationType: 'terms',
        sourceField: 'source',
        params: {
          orderBy: { type: 'alphabetical', fallback: true },
          orderDirection: 'desc',
          size: 5,
        },
      };

      replaceColumn({
        layer: {
          indexPatternId: '1',
          columnOrder: ['col1'],
          columns: {
            col1: termsColumn,
          },
        },
        indexPattern,
        columnId: 'col1',
        op: 'cumulative_sum',
        visualizationGroups: [],
        field: indexPattern.getFieldByName(termsColumn.sourceField),
        initialParams: {
          params: { secondaryFields: ['dest'] },
        },
        shouldCombineField: true,
      });
    });

    describe('switching from non-reference to reference test cases', () => {
      it('should wrap around the previous operation as a reference if possible (case new1)', () => {
        const expectedColumn = {
          label: 'Count',
          customLabel: true,
          dataType: 'number' as const,
          isBucketed: false,
          sourceField: '___records___',
          operationType: 'count' as const,
        };

        const layer: IndexPatternLayer = {
          indexPatternId: '1',
          columnOrder: ['col1'],
          columns: { col1: expectedColumn },
        };
        const result = replaceColumn({
          layer,
          indexPattern,
          columnId: 'col1',
          op: 'testReference' as OperationType,
          visualizationGroups: [],
        });

        expect(operationDefinitionMap.testReference.buildColumn).toHaveBeenCalledWith(
          expect.objectContaining({
            referenceIds: ['id1'],
          })
        );
        expect(result.columnOrder).toEqual(['col1', 'id1']);
        expect(result.columns).toEqual(
          expect.objectContaining({
            id1: expectedColumn,
            col1: expect.any(Object),
          })
        );
      });

      it('should remove filter from the wrapped column if it gets wrapped (case new1)', () => {
        const expectedColumn = {
          label: 'Count',
          customLabel: true,
          dataType: 'number' as const,
          isBucketed: false,
          sourceField: '___records___',
          operationType: 'count' as const,
        };

        const testFilter = { language: 'kuery', query: '' };

        const layer: IndexPatternLayer = {
          indexPatternId: '1',
          columnOrder: ['col1'],
          columns: { col1: { ...expectedColumn, filter: testFilter } },
        };
        const result = replaceColumn({
          layer,
          indexPattern,
          columnId: 'col1',
          op: 'testReference' as OperationType,
          visualizationGroups: [],
        });

        expect(operationDefinitionMap.testReference.buildColumn).toHaveBeenCalledWith(
          expect.objectContaining({
            referenceIds: ['id1'],
            previousColumn: expect.objectContaining({
              // filter should be passed to the buildColumn function of the target operation
              filter: testFilter,
            }),
          })
        );
        expect(result.columns).toEqual(
          expect.objectContaining({
            // filter should be stripped from the original column
            id1: expectedColumn,
            col1: expect.any(Object),
          })
        );
      });

      it('should create a new no-input operation to use as reference (case new2)', () => {
        // @ts-expect-error this function is not valid
        operationDefinitionMap.testReference.requiredReferences = [
          {
            input: ['none'],
            validateMetadata: () => true,
          },
        ];
        const layer: IndexPatternLayer = {
          indexPatternId: '1',
          columnOrder: ['col1'],
          columns: {
            col1: {
              label: 'Avg',
              dataType: 'number' as const,
              isBucketed: false,
              sourceField: 'bytes',
              operationType: 'average' as const,
            },
          },
        };
        const result = replaceColumn({
          layer,
          indexPattern,
          columnId: 'col1',
          op: 'testReference',
          visualizationGroups: [],
        });

        expect(result.columnOrder).toEqual(['id1', 'col1']);
        expect(result.columns).toEqual({
          id1: expect.objectContaining({
            operationType: 'filters',
          }),
          col1: expect.objectContaining({
            operationType: 'testReference',
          }),
        });
      });

      it('should use the previous field, but select the best operation, when creating a reference (case new3)', () => {
        // @ts-expect-error this function is not valid
        operationDefinitionMap.testReference.requiredReferences = [
          {
            input: ['field'],
            validateMetadata: () => true,
            specificOperations: ['unique_count', 'sum', 'average'], // this order is ignored
          },
        ];
        const layer: IndexPatternLayer = {
          indexPatternId: '1',
          columnOrder: ['col1'],
          columns: {
            col1: {
              label: 'Max',
              dataType: 'number' as const,
              isBucketed: false,
              sourceField: 'bytes',
              operationType: 'max' as const,
            },
          },
        };
        const result = replaceColumn({
          layer,
          indexPattern,
          columnId: 'col1',
          op: 'testReference',
          visualizationGroups: [],
        });

        expect(result.columnOrder).toEqual(['col1', 'id1']);
        expect(result.columns).toEqual({
          id1: expect.objectContaining({
            operationType: 'average',
          }),
          col1: expect.objectContaining({
            operationType: 'testReference',
          }),
        });
      });

      it('should ignore previous field and previous operation, but set incomplete operation if known (case new4)', () => {
        // @ts-expect-error this function is not valid
        operationDefinitionMap.testReference.requiredReferences = [
          {
            input: ['field'],
            validateMetadata: () => true,
            specificOperations: ['unique_count'],
          },
        ];
        const layer: IndexPatternLayer = {
          indexPatternId: '1',
          columnOrder: ['col1'],
          columns: {
            col1: {
              label: 'Count',
              dataType: 'number' as const,
              isBucketed: false,
              sourceField: '___records___',
              operationType: 'count' as const,
            },
          },
        };
        const result = replaceColumn({
          layer,
          indexPattern,
          columnId: 'col1',
          op: 'testReference',
          visualizationGroups: [],
        });

        expect(result.incompleteColumns).toEqual({
          id1: { operationType: 'unique_count' },
        });
        expect(result.columns).toEqual({
          col1: expect.objectContaining({
            operationType: 'testReference',
          }),
        });
      });

      it('should leave an empty reference if all the other cases fail (case new6)', () => {
        // @ts-expect-error this function is not valid
        operationDefinitionMap.testReference.requiredReferences = [
          {
            input: ['field'],
            validateMetadata: () => false,
            specificOperations: [],
          },
        ];
        const layer: IndexPatternLayer = {
          indexPatternId: '1',
          columnOrder: ['col1'],
          columns: {
            col1: {
              label: 'Count',
              dataType: 'number' as const,
              isBucketed: false,
              sourceField: '___records___',
              operationType: 'count' as const,
            },
          },
        };
        const result = replaceColumn({
          layer,
          indexPattern,
          columnId: 'col1',
          op: 'testReference',
          visualizationGroups: [],
        });

        expect(result.incompleteColumns).toEqual({});
        expect(result.columns).toEqual({
          col1: expect.objectContaining({
            operationType: 'testReference',
            references: ['id1'],
          }),
        });
      });
    });

    describe('switching from reference to reference test cases', () => {
      beforeEach(() => {
        operationDefinitionMap.secondTest = {
          input: 'fullReference',
          displayName: 'Reference test 2',
          type: 'secondTest',
          selectionStyle: 'full',
          requiredReferences: [
            {
              // Any numeric metric that isn't also a reference
              input: ['none', 'field'],
              validateMetadata: (meta: OperationMetadata) =>
                meta.dataType === 'number' && !meta.isBucketed,
            },
          ],
          buildColumn: jest.fn((args) => {
            return {
              label: 'Test reference',
              isBucketed: false,
              dataType: 'number',

              operationType: 'secondTest',
              references: args.referenceIds,
            };
          }),
          isTransferable: jest.fn(),
          toExpression: jest.fn().mockReturnValue([]),
          getPossibleOperation: jest
            .fn()
            .mockReturnValue({ dataType: 'number', isBucketed: false }),
          getDefaultLabel: jest.fn().mockReturnValue('Test reference'),
        };
      });

      afterEach(() => {
        delete operationDefinitionMap.secondTest;
      });

      it('should use existing references, delete invalid, when switching from one reference to another (case ref1)', () => {
        const layer: IndexPatternLayer = {
          indexPatternId: '1',
          columnOrder: ['ref1', 'invalid', 'output'],
          columns: {
            ref1: {
              label: 'Count',
              customLabel: true,
              dataType: 'number' as const,
              isBucketed: false,

              operationType: 'count' as const,
              sourceField: '___records___',
            },
            invalid: {
              label: 'Test reference',
              dataType: 'number',
              isBucketed: false,

              operationType: 'testReference',
              references: [],
            },
            output: {
              label: 'Test reference',
              dataType: 'number',
              isBucketed: false,

              operationType: 'testReference',
              references: ['ref1', 'invalid'],
            },
          },
        };
        expect(
          replaceColumn({
            layer,
            indexPattern,
            columnId: 'output',
            op: 'secondTest',
            visualizationGroups: [],
          })
        ).toEqual(
          expect.objectContaining({
            columnOrder: ['ref1', 'output'],
            columns: {
              ref1: layer.columns.ref1,
              output: expect.objectContaining({ references: ['ref1'] }),
            },
            incompleteColumns: {},
          })
        );
      });

      it('should modify a copied object, not the original layer', () => {
        const layer: IndexPatternLayer = {
          indexPatternId: '1',
          columnOrder: ['ref1', 'invalid', 'output'],
          columns: {
            ref1: {
              label: 'Count',
              customLabel: true,
              dataType: 'number' as const,
              isBucketed: false,

              operationType: 'count' as const,
              sourceField: '___records___',
            },
            invalid: {
              label: 'Test reference',
              dataType: 'number',
              isBucketed: false,

              operationType: 'testReference',
              references: [],
            },
            output: {
              label: 'Test reference',
              dataType: 'number',
              isBucketed: false,

              operationType: 'testReference',
              references: ['ref1', 'invalid'],
            },
          },
        };
        replaceColumn({
          layer,
          indexPattern,
          columnId: 'output',
          op: 'secondTest',
          visualizationGroups: [],
        });
        expect(layer.columns.output).toEqual(
          expect.objectContaining({ references: ['ref1', 'invalid'] })
        );
      });

      it('should transition from managedReference to fullReference by deleting the managedReference', () => {
        const math = {
          customLabel: true,
          dataType: 'number' as const,
          isBucketed: false,
          label: 'math',
          operationType: 'math' as const,
        };
        const layer: IndexPatternLayer = {
          indexPatternId: '',
          columnOrder: [],
          columns: {
            source: {
              dataType: 'number' as const,
              isBucketed: false,
              label: 'Formula',
              operationType: 'formula' as const,
              params: {
                formula: 'moving_average(sum(bytes), window=5)',
                isFormulaBroken: false,
              },
              references: ['formulaX3'],
            } as FormulaIndexPatternColumn,
            formulaX0: {
              customLabel: true,
              dataType: 'number' as const,
              isBucketed: false,
              label: 'formulaX0',
              operationType: 'sum' as const,
              scale: 'ratio' as const,
              sourceField: 'bytes',
            },
            formulaX1: {
              ...math,
              label: 'formulaX1',
              references: ['formulaX0'],
              params: { tinymathAst: 'formulaX0' },
            } as MathIndexPatternColumn,
            formulaX2: {
              customLabel: true,
              dataType: 'number' as const,
              isBucketed: false,
              label: 'formulaX2',
              operationType: 'moving_average' as const,
              params: { window: 5 },
              references: ['formulaX1'],
            } as MovingAverageIndexPatternColumn,
            formulaX3: {
              ...math,
              label: 'formulaX3',
              references: ['formulaX2'],
              params: { tinymathAst: 'formulaX2' },
            } as MathIndexPatternColumn,
          },
        };

        expect(
          replaceColumn({
            layer,
            indexPattern,
            columnId: 'source',
            op: 'secondTest',
            visualizationGroups: [],
          })
        ).toEqual(
          expect.objectContaining({
            columnOrder: ['source'],
            columns: {
              source: expect.objectContaining({
                operationType: 'secondTest',
                references: ['id1'],
              }),
            },
          })
        );
      });

      it('should transition by using the field from the previous reference if nothing else works (case new5)', () => {
        const layer: IndexPatternLayer = {
          indexPatternId: '1',
          columnOrder: ['fieldReused', 'output'],
          columns: {
            fieldReused: {
              label: 'Date histogram',
              dataType: 'date' as const,
              isBucketed: true,
              operationType: 'date_histogram' as const,
              sourceField: 'timestamp',
              params: { interval: 'auto' },
            } as DateHistogramIndexPatternColumn,
            output: {
              label: 'Test reference',
              dataType: 'number',
              isBucketed: false,
              operationType: 'testReference',
              references: ['fieldReused'],
            },
          },
        };
        expect(
          replaceColumn({
            layer,
            indexPattern,
            columnId: 'output',
            op: 'secondTest',
            visualizationGroups: [],
          })
        ).toEqual(
          expect.objectContaining({
            columnOrder: ['output', 'id1'],
            columns: {
              id1: expect.objectContaining({
                sourceField: 'timestamp',
                operationType: 'unique_count',
              }),
              output: expect.objectContaining({ references: ['id1'] }),
            },
            incompleteColumns: {},
          })
        );
      });
    });

    describe('switching from reference to non-reference', () => {
      it('should promote the inner references when switching away from reference to no-input (case a1)', () => {
        // @ts-expect-error this function is not valid
        operationDefinitionMap.testReference.requiredReferences = [
          {
            input: ['none'],
            validateMetadata: () => true,
          },
        ];
        const expectedCol = {
          label: 'Custom label',
          customLabel: true,
          dataType: 'string' as const,
          isBucketed: true,

          operationType: 'filters' as const,
          params: {
            // These filters are reset
            filters: [
              { input: { query: 'field: true', language: 'kuery' }, label: 'Custom label' },
            ],
          },
        };
        const layer: IndexPatternLayer = {
          indexPatternId: '1',
          columnOrder: ['col1', 'col2'],
          columns: {
            col1: expectedCol,
            col2: {
              label: 'Test reference',
              dataType: 'number',
              isBucketed: false,

              operationType: 'testReference',
              references: ['col1'],
            },
          },
        };
        expect(
          replaceColumn({
            layer,
            indexPattern,
            columnId: 'col2',
            op: 'filters',
            visualizationGroups: [],
          })
        ).toEqual(
          expect.objectContaining({
            columnOrder: ['col2'],
            columns: {
              col2: expectedCol,
            },
          })
        );
      });

      it('should promote the inner references when switching away from reference to field-based operation (case a2)', () => {
        const expectedCol = {
          label: 'Count of records -3h',
          dataType: 'number' as const,
          isBucketed: false,

          operationType: 'count' as const,
          sourceField: '___records___',
          filter: { language: 'kuery', query: 'bytes > 4000' },
          timeShift: '3h',
        };
        const layer: IndexPatternLayer = {
          indexPatternId: '1',
          columnOrder: ['col1', 'col2'],
          columns: {
            col1: expectedCol,
            col2: {
              label: 'Default label',
              dataType: 'number',
              isBucketed: false,

              operationType: 'testReference',
              references: ['col1'],
              filter: { language: 'kuery', query: 'bytes > 4000' },
              timeShift: '3h',
            },
          },
        };
        expect(
          replaceColumn({
            layer,
            indexPattern,
            columnId: 'col2',
            op: 'count',
            field: documentField,
            visualizationGroups: [],
          })
        ).toEqual(
          expect.objectContaining({
            columnOrder: ['col2'],
            columns: {
              col2: expect.objectContaining(expectedCol),
            },
          })
        );
      });

      it('should promote only the field when going from reference to field-based operation (case a3)', () => {
        const expectedColumn = {
          dataType: 'number' as const,
          isBucketed: false,
          sourceField: 'bytes',
          operationType: 'average' as const,
          filter: { language: 'kuery', query: 'bytes > 4000' },
          timeShift: '3h',
        };

        const layer: IndexPatternLayer = {
          indexPatternId: '1',
          columnOrder: ['metric', 'ref'],
          columns: {
            metric: { ...expectedColumn, label: 'Avg', customLabel: true },
            ref: {
              label: 'Reference',
              dataType: 'number',
              isBucketed: false,
              operationType: 'differences',
              references: ['metric'],
              filter: { language: 'kuery', query: 'bytes > 4000' },
              timeShift: '3h',
            },
          },
        };
        const result = replaceColumn({
          layer,
          indexPattern,
          columnId: 'ref',
          op: 'sum',
          visualizationGroups: [],
        });

        expect(result.columnOrder).toEqual(['ref']);
        expect(result.columns).toEqual(
          expect.objectContaining({
            ref: expect.objectContaining({ ...expectedColumn, operationType: 'sum' }),
          })
        );
      });

      it('should keep state and set incomplete column on incompatible switch', () => {
        const layer: IndexPatternLayer = {
          indexPatternId: '1',
          columnOrder: ['metric', 'ref'],
          columns: {
            metric: {
              dataType: 'number' as const,
              isBucketed: false,
              sourceField: 'source',
              operationType: 'unique_count' as const,
              filter: { language: 'kuery', query: 'bytes > 4000' },
              timeShift: '3h',
              label: 'Cardinality',
              customLabel: true,
            },
            ref: {
              label: 'Reference',
              dataType: 'number',
              isBucketed: false,
              operationType: 'differences',
              references: ['metric'],
              filter: { language: 'kuery', query: 'bytes > 4000' },
              timeShift: '3h',
            },
          },
        };
        const result = replaceColumn({
          layer,
          indexPattern,
          columnId: 'ref',
          op: 'sum',
          visualizationGroups: [],
        });
        expect(result.columnOrder).toEqual(layer.columnOrder);
        expect(result.columns).toEqual(layer.columns);
        expect(result.incompleteColumns).toEqual({
          ref: {
            operationType: 'sum',
            filter: {
              language: 'kuery',
              query: 'bytes > 4000',
            },
            timeScale: undefined,
            timeShift: '3h',
          },
        });
      });

      it('should carry over a custom formatting when transitioning from a managed reference', () => {
        const actual = replaceColumn({
          layer: {
            indexPatternId: '1',
            columnOrder: ['col1', 'col2'],
            columns: {
              col1: {
                label: 'MY CUSTOM LABEL',
                customLabel: true,
                dataType: 'number',
                operationType: 'formula',
                isBucketed: false,
                scale: 'ratio',
                params: {
                  isFormulaBroken: false,
                  formula: 'average(bytes)',
                  format: {
                    id: 'number',
                    params: { decimals: 2 },
                  },
                },
                references: [],
              } as FormulaIndexPatternColumn,
            },
          },
          indexPattern,
          columnId: 'col1',
          op: 'average',
          field: indexPattern.fields[2], // bytes field
          visualizationGroups: [],
          shouldResetLabel: undefined,
        });

        expect(actual.columns.col1).toEqual(
          expect.objectContaining({
            params: {
              format: {
                id: 'number',
                params: { decimals: 2 },
              },
            },
          })
        );
      });
    });

    it('should allow making a replacement on an operation that is being referenced, even if it ends up invalid', () => {
      // @ts-expect-error this function is not valid
      operationDefinitionMap.testReference.requiredReferences = [
        {
          input: ['field'],
          validateMetadata: (meta: OperationMetadata) => meta.dataType === 'number',
          specificOperations: ['sum'],
        },
      ];

      const layer: IndexPatternLayer = {
        indexPatternId: '1',
        columnOrder: ['col1', 'col2'],
        columns: {
          col1: {
            label: 'Asdf',
            customLabel: true,
            dataType: 'number' as const,
            isBucketed: false,

            operationType: 'sum' as const,
            sourceField: 'bytes',
          },
          col2: {
            label: 'Test reference',
            dataType: 'number',
            isBucketed: false,

            operationType: 'testReference',
            references: ['col1'],
          },
        },
      };
      expect(
        replaceColumn({
          layer,
          indexPattern,
          columnId: 'col1',
          op: 'count',
          field: documentField,
          visualizationGroups: [],
        })
      ).toEqual(
        expect.objectContaining({
          columnOrder: ['col1', 'col2'],
          columns: {
            col1: expect.objectContaining({
              sourceField: '___records___',
              operationType: 'count',
            }),
            col2: expect.objectContaining({ references: ['col1'] }),
          },
        })
      );
    });
  });

  describe('deleteColumn', () => {
    it('should clear incomplete columns when column is already empty', () => {
      expect(
        deleteColumn({
          layer: {
            indexPatternId: '1',
            columnOrder: [],
            columns: {},
            incompleteColumns: {
              col1: { sourceField: 'test' },
            },
          },
          columnId: 'col1',
          indexPattern,
        })
      ).toEqual({
        indexPatternId: '1',
        columnOrder: [],
        columns: {},
        incompleteColumns: {},
      });
    });

    it('should remove column and any incomplete state', () => {
      const termsColumn: TermsIndexPatternColumn = {
        label: 'Top values of source',
        dataType: 'string',
        isBucketed: true,

        // Private
        operationType: 'terms',
        sourceField: 'source',
        params: {
          orderBy: { type: 'column', columnId: 'col2' },
          orderDirection: 'desc',
          size: 5,
        },
      };

      expect(
        deleteColumn({
          layer: {
            indexPatternId: '1',
            columnOrder: ['col1', 'col2'],
            columns: {
              col1: termsColumn,
              col2: {
                label: 'Count of records',
                dataType: 'number',
                isBucketed: false,
                sourceField: '___records___',
                operationType: 'count',
              },
            },
            incompleteColumns: {
              col2: { sourceField: 'other' },
            },
          },
          columnId: 'col2',
          indexPattern,
        })
      ).toEqual({
        indexPatternId: '1',
        columnOrder: ['col1'],
        columns: {
          col1: {
            ...termsColumn,
            params: {
              ...termsColumn.params,
              orderBy: { type: 'alphabetical', fallback: true },
              orderDirection: 'asc',
            },
          },
        },
        incompleteColumns: {},
      });
    });

    it('should adjust when deleting other columns', () => {
      const termsColumn: TermsIndexPatternColumn = {
        label: 'Top values of source',
        dataType: 'string',
        isBucketed: true,

        // Private
        operationType: 'terms',
        sourceField: 'source',
        params: {
          orderBy: { type: 'alphabetical' },
          orderDirection: 'asc',
          size: 5,
        },
      };

      deleteColumn({
        layer: {
          indexPatternId: '1',
          columnOrder: ['col1', 'col2'],
          columns: {
            col1: termsColumn,
            col2: {
              label: 'Count',
              dataType: 'number',
              isBucketed: false,
              sourceField: '___records___',
              operationType: 'count',
            },
          },
        },
        columnId: 'col2',
        indexPattern,
      });

      expect(operationDefinitionMap.terms.onOtherColumnChanged).toHaveBeenCalledWith(
        { indexPatternId: '1', columnOrder: ['col1', 'col2'], columns: { col1: termsColumn } },
        'col1',
        'col2'
      );
    });

    it('should delete the column and all of its references', () => {
      const layer: IndexPatternLayer = {
        indexPatternId: '1',
        columnOrder: ['col1', 'col2'],
        columns: {
          col1: {
            label: 'Count',
            dataType: 'number',
            isBucketed: false,

            operationType: 'count',
            sourceField: '___records___',
          },
          col2: {
            label: 'Test reference',
            dataType: 'number',
            isBucketed: false,

            operationType: 'testReference',
            references: ['col1'],
          },
        },
      };
      expect(deleteColumn({ layer, columnId: 'col2', indexPattern })).toEqual(
        expect.objectContaining({ columnOrder: [], columns: {} })
      );
    });

    it('should update the labels when deleting columns', () => {
      const layer: IndexPatternLayer = {
        indexPatternId: '1',
        columnOrder: ['col1', 'col2'],
        columns: {
          col1: {
            label: 'Count',
            dataType: 'number',
            isBucketed: false,

            operationType: 'count',
            sourceField: '___records___',
          },
          col2: {
            label: 'Changed label',
            dataType: 'number',
            isBucketed: false,

            operationType: 'testReference',
            references: ['col1'],
          },
        },
      };
      deleteColumn({ layer, columnId: 'col1', indexPattern });
      expect(operationDefinitionMap.testReference.getDefaultLabel).toHaveBeenCalledWith(
        {
          label: 'Changed label',
          dataType: 'number',
          isBucketed: false,
          operationType: 'testReference',
          references: ['col1'],
        },
        indexPattern,
        {
          col2: {
            label: 'Default label',
            dataType: 'number',
            isBucketed: false,
            operationType: 'testReference',
            references: ['col1'],
          },
        }
      );
    });

    it('should recursively delete references', () => {
      const layer: IndexPatternLayer = {
        indexPatternId: '1',
        columnOrder: ['col1', 'col2', 'col3'],
        columns: {
          col1: {
            label: 'Count',
            dataType: 'number',
            isBucketed: false,

            operationType: 'count',
            sourceField: '___records___',
          },
          col2: {
            label: 'Test reference',
            dataType: 'number',
            isBucketed: false,

            operationType: 'testReference',
            references: ['col1'],
          },
          col3: {
            label: 'Test reference 2',
            dataType: 'number',
            isBucketed: false,

            operationType: 'testReference',
            references: ['col2'],
          },
        },
      };
      expect(deleteColumn({ layer, columnId: 'col3', indexPattern })).toEqual(
        expect.objectContaining({ columnOrder: [], columns: {} })
      );
    });
  });

  describe('updateColumnParam', () => {
    it('should set the param for the given column', () => {
      const currentColumn: DateHistogramIndexPatternColumn = {
        label: 'Value of timestamp',
        dataType: 'date',
        isBucketed: true,

        // Private
        operationType: 'date_histogram',
        params: {
          interval: '1d',
        },
        sourceField: 'timestamp',
      };

      expect(
        updateColumnParam({
          layer: {
            indexPatternId: '1',
            columnOrder: ['col1'],
            columns: {
              col1: currentColumn,
            },
          },
          columnId: 'col1',
          paramName: 'interval',
          value: 'M',
        }).columns.col1
      ).toEqual({
        ...currentColumn,
        params: { interval: 'M' },
      });
    });

    it('should set optional params', () => {
      const currentColumn: AvgIndexPatternColumn = {
        label: 'Avg of bytes',
        dataType: 'number',
        isBucketed: false,
        // Private
        operationType: 'average',
        sourceField: 'bytes',
      };

      expect(
        updateColumnParam({
          layer: {
            indexPatternId: '1',
            columnOrder: ['col1'],
            columns: {
              col1: currentColumn,
            },
          },
          columnId: 'col1',
          paramName: 'format',
          value: { id: 'bytes' },
        }).columns.col1
      ).toEqual({
        ...currentColumn,
        params: { format: { id: 'bytes' } },
      });
    });
  });

  describe('getColumnOrder', () => {
    it('should work for empty columns', () => {
      expect(
        getColumnOrder({
          indexPatternId: '',
          columnOrder: [],
          columns: {},
        })
      ).toEqual([]);
    });

    it('should work for one column', () => {
      expect(
        getColumnOrder({
          columnOrder: [],
          indexPatternId: '',
          columns: {
            col1: {
              label: 'Value of timestamp',
              dataType: 'string',
              isBucketed: false,

              // Private
              operationType: 'date_histogram',
              sourceField: 'timestamp',
              params: {
                interval: 'h',
              },
            } as DateHistogramIndexPatternColumn,
          },
        })
      ).toEqual(['col1']);
    });

    it('should put any number of aggregations before metrics', () => {
      expect(
        getColumnOrder({
          columnOrder: [],
          indexPatternId: '',
          columns: {
            col1: {
              label: 'Top values of category',
              dataType: 'string',
              isBucketed: true,

              // Private
              operationType: 'terms',
              sourceField: 'category',
              params: {
                size: 5,
                orderBy: {
                  type: 'alphabetical',
                },
                orderDirection: 'asc',
              },
            } as TermsIndexPatternColumn,
            col2: {
              label: 'Average of bytes',
              dataType: 'number',
              isBucketed: false,

              // Private
              operationType: 'average',
              sourceField: 'bytes',
            },
            col3: {
              label: 'Date histogram of timestamp',
              dataType: 'date',
              isBucketed: true,

              // Private
              operationType: 'date_histogram',
              sourceField: 'timestamp',
              params: {
                interval: '1d',
              },
            } as DateHistogramIndexPatternColumn,
          },
        })
      ).toEqual(['col1', 'col3', 'col2']);
    });

    it('does not topologically sort formulas, but keeps the relative order', () => {
      expect(
        getColumnOrder({
          indexPatternId: '',
          columnOrder: [],
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
        })
      ).toEqual(['date', 'count', 'formula', 'countX0', 'math']);
    });
  });

  describe('updateLayerIndexPattern', () => {
    const fields = [
      {
        name: 'fieldA',
        displayName: 'fieldA',
        aggregatable: true,
        searchable: true,
        type: 'string',
      },
      {
        name: 'fieldB',
        displayName: 'fieldB',
        aggregatable: true,
        searchable: true,
        type: 'number',
        aggregationRestrictions: {
          average: {
            agg: 'avg',
          },
        },
      },
      {
        name: 'fieldC',
        displayName: 'fieldC',
        aggregatable: false,
        searchable: true,
        type: 'date',
      },
      {
        name: 'fieldD',
        displayName: 'fieldD',
        aggregatable: true,
        searchable: true,
        type: 'date',
        aggregationRestrictions: {
          date_histogram: {
            agg: 'date_histogram',
            time_zone: 'CET',
            calendar_interval: 'w',
          },
        },
      },
      {
        name: 'fieldE',
        displayName: 'fieldE',
        aggregatable: true,
        searchable: true,
        type: 'date',
      },
    ];
    const newIndexPattern: IndexPattern = {
      id: 'test',
      title: '',
      hasRestrictions: true,
      getFieldByName: getFieldByNameFactory(fields),
      fields,
    };

    it('should switch index pattern id in layer', () => {
      const layer = { columnOrder: [], columns: {}, indexPatternId: 'original' };
      expect(updateLayerIndexPattern(layer, newIndexPattern)).toEqual({
        ...layer,
        indexPatternId: 'test',
      });
    });

    it('should remove operations referencing unavailable fields', () => {
      const layer: IndexPatternLayer = {
        columnOrder: ['col1', 'col2'],
        columns: {
          col1: {
            dataType: 'string',
            isBucketed: true,
            label: '',
            operationType: 'terms',
            sourceField: 'fieldA',
            params: {
              orderBy: { type: 'alphabetical' },
              orderDirection: 'asc',
              size: 3,
            },
          } as TermsIndexPatternColumn,
          col2: {
            dataType: 'number',
            isBucketed: false,
            label: '',
            operationType: 'average',
            sourceField: 'xxx',
          },
        },
        indexPatternId: 'original',
      };
      const updatedLayer = updateLayerIndexPattern(layer, newIndexPattern);
      expect(updatedLayer.columnOrder).toEqual(['col1']);
      expect(updatedLayer.columns).toEqual({
        col1: layer.columns.col1,
      });
    });

    it('should remove operations indirectly referencing unavailable fields', () => {
      const layer: IndexPatternLayer = {
        columnOrder: ['col1', 'col2'],
        columns: {
          col1: {
            label: '',
            dataType: 'number',
            operationType: 'moving_average',
            isBucketed: false,
            scale: 'ratio',
            references: ['col2'],
            timeScale: undefined,
            filter: undefined,
            params: {
              window: 7,
            },
          } as MovingAverageIndexPatternColumn,
          col2: {
            dataType: 'number',
            isBucketed: false,
            label: '',
            operationType: 'average',
            sourceField: 'xxx',
          },
        },
        indexPatternId: 'original',
      };
      const updatedLayer = updateLayerIndexPattern(layer, newIndexPattern);
      expect(updatedLayer.columnOrder).toEqual([]);
      expect(updatedLayer.columns).toEqual({});
    });

    it('should remove operations referencing fields with insufficient capabilities', () => {
      const layer: IndexPatternLayer = {
        columnOrder: ['col1', 'col2'],
        columns: {
          col1: {
            dataType: 'string',
            isBucketed: true,
            label: '',
            operationType: 'date_histogram',
            sourceField: 'fieldC',
            params: {
              interval: 'd',
            },
          } as DateHistogramIndexPatternColumn,
          col2: {
            dataType: 'number',
            isBucketed: false,
            label: '',
            operationType: 'average',
            sourceField: 'fieldB',
          },
        },
        indexPatternId: 'original',
      };
      const updatedLayer = updateLayerIndexPattern(layer, newIndexPattern);
      expect(updatedLayer.columnOrder).toEqual(['col2']);
      expect(updatedLayer.columns).toEqual({
        col2: layer.columns.col2,
      });
    });

    // no operation currently requires this check, faking a transfer function to check whether the generic logic works
    it('should rewrite column params if that is necessary due to restrictions', () => {
      operationDefinitionMap.date_histogram.transfer = ((oldColumn) => ({
        ...oldColumn,
        params: {
          ...(oldColumn as DateHistogramIndexPatternColumn).params,
          interval: 'w',
        },
      })) as OperationDefinition<GenericIndexPatternColumn, 'field'>['transfer'];
      const layer: IndexPatternLayer = {
        columnOrder: ['col1', 'col2'],
        columns: {
          col1: {
            dataType: 'date',
            isBucketed: true,
            label: '',
            operationType: 'date_histogram',
            sourceField: 'fieldD',
            params: {
              interval: 'd',
            },
          } as DateHistogramIndexPatternColumn,
        },
        indexPatternId: 'original',
      };
      const updatedLayer = updateLayerIndexPattern(layer, newIndexPattern);
      expect(updatedLayer.columnOrder).toEqual(['col1']);
      expect(updatedLayer.columns).toEqual({
        col1: {
          ...layer.columns.col1,
          params: {
            interval: 'w',
          },
        },
      });
      delete operationDefinitionMap.date_histogram.transfer;
    });

    it('should remove operations referencing fields with wrong field types', () => {
      const layer: IndexPatternLayer = {
        columnOrder: ['col1', 'col2'],
        columns: {
          col1: {
            dataType: 'string',
            isBucketed: true,
            label: '',
            operationType: 'terms',
            sourceField: 'fieldA',
            params: {
              orderBy: { type: 'alphabetical' },
              orderDirection: 'asc',
              size: 3,
            },
          } as TermsIndexPatternColumn,
          col2: {
            dataType: 'number',
            isBucketed: false,
            label: '',
            operationType: 'average',
            sourceField: 'fieldD',
          },
        },
        indexPatternId: 'original',
      };
      const updatedLayer = updateLayerIndexPattern(layer, newIndexPattern);
      expect(updatedLayer.columnOrder).toEqual(['col1']);
      expect(updatedLayer.columns).toEqual({
        col1: layer.columns.col1,
      });
    });

    it('should remove operations referencing fields with incompatible restrictions', () => {
      const layer: IndexPatternLayer = {
        columnOrder: ['col1', 'col2'],
        columns: {
          col1: {
            dataType: 'string',
            isBucketed: true,
            label: '',
            operationType: 'terms',
            sourceField: 'fieldA',
            params: {
              orderBy: { type: 'alphabetical' },
              orderDirection: 'asc',
              size: 3,
            },
          } as TermsIndexPatternColumn,
          col2: {
            dataType: 'number',
            isBucketed: false,
            label: '',
            operationType: 'min',
            sourceField: 'fieldC',
          },
        },
        indexPatternId: 'original',
      };
      const updatedLayer = updateLayerIndexPattern(layer, newIndexPattern);
      expect(updatedLayer.columnOrder).toEqual(['col1']);
      expect(updatedLayer.columns).toEqual({
        col1: layer.columns.col1,
      });
    });
  });

  describe('getErrorMessages', () => {
    it('should collect errors from metric-type operation definitions', () => {
      const mock = jest.fn().mockReturnValue(['error 1']);
      operationDefinitionMap.average.getErrorMessage = mock;
      const errors = getErrorMessages(
        {
          indexPatternId: '1',
          columnOrder: [],
          columns: {
            // @ts-expect-error invalid column
            col1: { operationType: 'average' },
          },
        },
        indexPattern,
        {},
        '1',
        {}
      );
      expect(mock).toHaveBeenCalled();
      expect(errors).toHaveLength(1);
    });

    it('should collect errors from reference-type operation definitions', () => {
      const mock = jest.fn().mockReturnValue(['error 1']);
      operationDefinitionMap.testReference.getErrorMessage = mock;
      const errors = getErrorMessages(
        {
          indexPatternId: '1',
          columnOrder: [],
          columns: {
            col1: {
              operationType: 'testReference',
              references: [],
              label: '',
              dataType: 'number',
              isBucketed: false,
            },
          },
        },
        indexPattern,
        {} as IndexPatternPrivateState,
        '1',
        {} as CoreStart
      );
      expect(mock).toHaveBeenCalled();
      expect(errors).toHaveLength(1);
    });

    it('should only collect the top level errors from managed references', () => {
      const notCalledMock = jest.fn();
      const mock = jest.fn().mockReturnValue(['error 1']);
      operationDefinitionMap.testReference.getErrorMessage = notCalledMock;
      operationDefinitionMap.managedReference.getErrorMessage = mock;
      const errors = getErrorMessages(
        {
          indexPatternId: '1',
          columnOrder: [],
          columns: {
            col1: {
              operationType: 'managedReference',
              references: ['col2'],
              label: '',
              dataType: 'number',
              isBucketed: false,
            },
            col2: {
              operationType: 'testReference',
              references: [],
              label: '',
              dataType: 'number',
              isBucketed: false,
            },
          },
        },
        indexPattern,
        {} as IndexPatternPrivateState,
        '1',
        {} as CoreStart
      );
      expect(notCalledMock).not.toHaveBeenCalled();
      expect(mock).toHaveBeenCalledTimes(1);
      expect(errors).toHaveLength(1);
    });

    it('should ignore incompleteColumns when checking for errors', () => {
      const savedRef = jest.fn().mockReturnValue(['error 1']);
      const incompleteRef = jest.fn();
      operationDefinitionMap.testReference.getErrorMessage = savedRef;
      // @ts-expect-error invalid type, just need a single function on it
      operationDefinitionMap.testIncompleteReference = {
        getErrorMessage: incompleteRef,
      };

      const errors = getErrorMessages(
        {
          indexPatternId: '1',
          columnOrder: [],
          columns: {
            col1: {
              operationType: 'testReference',
              references: [],
              label: '',
              dataType: 'number',
              isBucketed: false,
            },
          },
          incompleteColumns: {
            col1: { operationType: 'testIncompleteReference' },
          },
        },
        indexPattern,
        {} as IndexPatternPrivateState,
        '1',
        {} as CoreStart
      );
      expect(savedRef).toHaveBeenCalled();
      expect(incompleteRef).not.toHaveBeenCalled();
      expect(errors).toHaveLength(1);

      delete operationDefinitionMap.testIncompleteReference;
    });

    it('should forward the indexpattern when available', () => {
      const mock = jest.fn();
      operationDefinitionMap.testReference.getErrorMessage = mock;
      getErrorMessages(
        {
          indexPatternId: '1',
          columnOrder: [],
          columns: {
            col1: {
              operationType: 'testReference',
              references: [],
              label: '',
              dataType: 'number',
              isBucketed: false,
            },
          },
        },
        indexPattern,
        {} as IndexPatternPrivateState,
        '1',
        {} as CoreStart
      );
      expect(mock).toHaveBeenCalledWith(
        {
          indexPatternId: '1',
          columnOrder: [],
          columns: {
            col1: {
              operationType: 'testReference',
              references: [],
              dataType: 'number',
              isBucketed: false,
              label: '',
            },
          },
        },
        'col1',
        indexPattern,
        operationDefinitionMap
      );
    });
  });

  describe('hasTermsWithManyBuckets', () => {
    it('should return false for a bucketed non terms operation', () => {
      const layer: IndexPatternLayer = {
        columnOrder: ['col1'],
        columns: {
          col1: {
            dataType: 'date',
            isBucketed: true,
            label: '',
            operationType: 'date_histogram',
            sourceField: 'fieldD',
            params: {
              interval: 'd',
            },
          } as DateHistogramIndexPatternColumn,
        },
        indexPatternId: 'original',
      };

      expect(hasTermsWithManyBuckets(layer)).toBeFalsy();
    });

    it('should return false if all terms operation have a lower size', () => {
      const layer: IndexPatternLayer = {
        columnOrder: ['col1'],
        columns: {
          col1: {
            label: 'My Op',
            customLabel: true,
            dataType: 'string',
            isBucketed: true,

            // Private
            operationType: 'terms',
            sourceField: 'dest',
            params: {
              size: 5,
              orderBy: { type: 'alphabetical' },
              orderDirection: 'asc',
            },
          } as TermsIndexPatternColumn,
        },
        indexPatternId: 'original',
      };

      expect(hasTermsWithManyBuckets(layer)).toBeFalsy();
    });

    it('should return true if the size is high', () => {
      const layer: IndexPatternLayer = {
        columnOrder: ['col1'],
        columns: {
          col1: {
            label: 'My Op',
            customLabel: true,
            dataType: 'string',
            isBucketed: true,

            // Private
            operationType: 'terms',
            sourceField: 'dest',
            params: {
              size: 15,
              orderBy: { type: 'alphabetical' },
              orderDirection: 'asc',
            },
          } as TermsIndexPatternColumn,
        },
        indexPatternId: 'original',
      };

      expect(hasTermsWithManyBuckets(layer)).toBeTruthy();
    });
  });

  describe('isReferenced', () => {
    it('should return false for top column which has references', () => {
      const layer: IndexPatternLayer = {
        indexPatternId: '1',
        columnOrder: [],
        columns: {
          col1: {
            operationType: 'managedReference',
            references: ['col2'],
            label: '',
            dataType: 'number',
            isBucketed: false,
          },
          col2: {
            operationType: 'testReference',
            references: [],
            label: '',
            dataType: 'number',
            isBucketed: false,
          },
        },
      };
      expect(isReferenced(layer, 'col1')).toBeFalsy();
    });

    it('should return true for referenced column', () => {
      const layer: IndexPatternLayer = {
        indexPatternId: '1',
        columnOrder: [],
        columns: {
          col1: {
            operationType: 'managedReference',
            references: ['col2'],
            label: '',
            dataType: 'number',
            isBucketed: false,
          },
          col2: {
            operationType: 'testReference',
            references: [],
            label: '',
            dataType: 'number',
            isBucketed: false,
          },
        },
      };
      expect(isReferenced(layer, 'col2')).toBeTruthy();
    });
  });

  describe('getReferenceRoot', () => {
    it("should just return the column id itself if it's not a referenced column", () => {
      const layer: IndexPatternLayer = {
        indexPatternId: '1',
        columnOrder: [],
        columns: {
          col1: {
            operationType: 'managedReference',
            references: ['col2'],
            label: '',
            dataType: 'number',
            isBucketed: false,
          },
          col2: {
            operationType: 'testReference',
            references: [],
            label: '',
            dataType: 'number',
            isBucketed: false,
          },
        },
      };
      expect(getReferenceRoot(layer, 'col1')).toEqual('col1');
    });

    it('should return the top column if a referenced column is passed', () => {
      const layer: IndexPatternLayer = {
        indexPatternId: '1',
        columnOrder: [],
        columns: {
          col1: {
            operationType: 'managedReference',
            references: ['col2'],
            label: '',
            dataType: 'number',
            isBucketed: false,
          },
          col2: {
            operationType: 'testReference',
            references: [],
            label: '',
            dataType: 'number',
            isBucketed: false,
          },
        },
      };
      expect(getReferenceRoot(layer, 'col2')).toEqual('col1');
    });

    it('should work for a formula chain', () => {
      const math = {
        customLabel: true,
        dataType: 'number' as const,
        isBucketed: false,
        label: 'math',
        operationType: 'math' as const,
      };
      const layer: IndexPatternLayer = {
        indexPatternId: '',
        columnOrder: [],
        columns: {
          source: {
            dataType: 'number' as const,
            isBucketed: false,
            label: 'Formula',
            operationType: 'formula' as const,
            params: {
              formula: 'moving_average(sum(bytes), window=5)',
              isFormulaBroken: false,
            },
            references: ['formulaX3'],
          } as FormulaIndexPatternColumn,
          formulaX0: {
            customLabel: true,
            dataType: 'number' as const,
            isBucketed: false,
            label: 'formulaX0',
            operationType: 'sum' as const,
            scale: 'ratio' as const,
            sourceField: 'bytes',
          },
          formulaX1: {
            ...math,
            label: 'formulaX1',
            references: ['formulaX0'],
            params: { tinymathAst: 'formulaX0' },
          } as MathIndexPatternColumn,
          formulaX2: {
            customLabel: true,
            dataType: 'number' as const,
            isBucketed: false,
            label: 'formulaX2',
            operationType: 'moving_average' as const,
            params: { window: 5 },
            references: ['formulaX1'],
          } as MovingAverageIndexPatternColumn,
          formulaX3: {
            ...math,
            label: 'formulaX3',
            references: ['formulaX2'],
            params: { tinymathAst: 'formulaX2' },
          } as MathIndexPatternColumn,
        },
      };
      expect(getReferenceRoot(layer, 'formulaX0')).toEqual('source');
    });
  });
});
