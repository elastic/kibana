/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import type { OperationMetadata } from '../../types';
import {
  insertNewColumn,
  replaceColumn,
  updateColumnParam,
  getColumnOrder,
  deleteColumn,
  updateLayerIndexPattern,
  getErrorMessages,
} from './layer_helpers';
import { operationDefinitionMap, OperationType } from '../operations';
import { TermsIndexPatternColumn } from './definitions/terms';
import { DateHistogramIndexPatternColumn } from './definitions/date_histogram';
import { AvgIndexPatternColumn } from './definitions/metrics';
import type { IndexPattern, IndexPatternPrivateState, IndexPatternLayer } from '../types';
import { documentField } from '../document_field';
import { getFieldByNameFactory } from '../pure_helpers';
import { generateId } from '../../id_generator';
import { createMockedReferenceOperation } from './mocks';

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
    operationDefinitionMap.testReference = createMockedReferenceOperation();
  });

  afterEach(() => {
    delete operationDefinitionMap.testReference;
  });

  describe('insertNewColumn', () => {
    it('should throw for invalid operations', () => {
      expect(() => {
        insertNewColumn({
          layer: { indexPatternId: '', columns: {}, columnOrder: [] },
          indexPattern,
          op: 'missing' as OperationType,
          columnId: 'none',
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
            operationType: 'avg',
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
            operationType: 'avg',
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
        })
      ).toEqual(expect.objectContaining({ columnOrder: ['col1', 'col2'] }));
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
          },
          col3: {
            label: 'Count of records',
            dataType: 'document',
            isBucketed: false,

            // Private
            operationType: 'count',
            sourceField: 'Records',
          },
        },
      };
      expect(
        insertNewColumn({
          layer,
          indexPattern,
          columnId: 'col2',
          op: 'filters',
        })
      ).toEqual(expect.objectContaining({ columnOrder: ['col1', 'col2', 'col3'] }));
    });

    it('should throw if the aggregation does not support the field', () => {
      expect(() => {
        insertNewColumn({
          layer: { indexPatternId: '1', columnOrder: [], columns: {} },
          columnId: 'col1',
          indexPattern,
          op: 'terms',
          field: indexPattern.fields[0],
        });
      }).toThrow();
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
              },
            },
          },
          columnId: 'col2',
          indexPattern,
          op: 'terms',
          field: indexPattern.fields[2],
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
              },
            },
          },
          columnId: 'col2',
          indexPattern,
          op: 'date_histogram',
          field: indexPattern.fields[0],
        })
      ).toEqual(expect.objectContaining({ columnOrder: ['col1', 'col2'] }));
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
                operationType: 'avg',
                sourceField: 'bytes',
              },
              col2: {
                label: 'Count of records',
                dataType: 'document',
                isBucketed: false,

                // Private
                operationType: 'count',
                sourceField: 'Records',
              },
            },
          },
          columnId: 'col3',
          indexPattern,
          op: 'sum',
          field: indexPattern.fields[2],
        })
      ).toEqual(expect.objectContaining({ columnOrder: ['col1', 'col2', 'col3'] }));
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
          // @ts-expect-error invalid type
          op: 'testReference',
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

              // @ts-expect-error only in test
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
            operationType: 'avg',
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
              },
            },
          },
          columnId: 'col1',
          indexPattern,
          op: 'date_histogram',
          field: indexPattern.fields[0],
        });
      }).toThrow();
    });

    it('should throw if switching to a field-based operation without providing a field', () => {
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
              },
            },
          },
          columnId: 'col1',
          indexPattern,
          op: 'date_histogram',
        });
      }).toThrow();
    });

    it('should carry over params from old column if the switching fields', () => {
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
              },
            },
          },
          columnId: 'col1',
          indexPattern,
          op: 'date_histogram',
          field: indexPattern.fields[1],
        }).columns.col1
      ).toEqual(
        expect.objectContaining({
          params: { interval: 'h' },
        })
      );
    });

    it('should transition from field-based to fieldless operation', () => {
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
              },
            },
          },
          indexPattern,
          columnId: 'col1',
          op: 'filters',
        }).columns.col1
      ).toEqual(
        expect.objectContaining({
          operationType: 'filters',
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
              },
            },
          },
          indexPattern,
          columnId: 'col1',
          op: 'date_histogram',
          field: indexPattern.fields[0],
        }).columns.col1
      ).toEqual(
        expect.objectContaining({
          operationType: 'date_histogram',
        })
      );
    });

    it('should carry over label on field switch when customLabel flag is set', () => {
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
              },
            },
          },
          indexPattern,
          columnId: 'col1',
          op: 'date_histogram',
          field: indexPattern.fields[1],
        }).columns.col1
      ).toEqual(
        expect.objectContaining({
          label: 'My custom label',
          customLabel: true,
        })
      );
    });

    it('should carry over label on operation switch when customLabel flag is set', () => {
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
              },
            },
          },
          indexPattern,
          columnId: 'col1',
          op: 'terms',
          field: indexPattern.fields[0],
        }).columns.col1
      ).toEqual(
        expect.objectContaining({
          label: 'My custom label',
          customLabel: true,
        })
      );
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
              sourceField: 'Records',
              operationType: 'count',
            },
          },
        },
        indexPattern,
        columnId: 'col2',
        op: 'avg',
        field: indexPattern.fields[2], // bytes field
      });

      expect(operationDefinitionMap.terms.onOtherColumnChanged).toHaveBeenCalledWith(termsColumn, {
        col1: termsColumn,
        col2: expect.objectContaining({
          label: 'Average of bytes',
          dataType: 'number',
          isBucketed: false,

          // Private
          operationType: 'avg',
          sourceField: 'bytes',
        }),
      });
    });

    it('should not wrap the previous operation when switching to reference', () => {
      const layer: IndexPatternLayer = {
        indexPatternId: '1',
        columnOrder: ['col1'],
        columns: {
          col1: {
            label: 'Count',
            customLabel: true,
            dataType: 'number' as const,
            isBucketed: false,
            sourceField: 'Records',
            operationType: 'count' as const,
          },
        },
      };
      const result = replaceColumn({
        layer,
        indexPattern,
        columnId: 'col1',
        op: 'testReference' as OperationType,
      });

      expect(operationDefinitionMap.testReference.buildColumn).toHaveBeenCalledWith(
        expect.objectContaining({
          referenceIds: ['id1'],
        })
      );
      expect(result.columns).toEqual(
        expect.objectContaining({
          col1: expect.objectContaining({ operationType: 'testReference' }),
        })
      );
    });

    it('should delete the previous references and reset to default values when going from reference to no-input', () => {
      // @ts-expect-error this function is not valid
      operationDefinitionMap.testReference.requiredReferences = [
        {
          input: ['none'],
          validateMetadata: () => true,
        },
      ];
      const expectedCol = {
        dataType: 'string' as const,
        isBucketed: true,

        operationType: 'filters' as const,
        params: {
          // These filters are reset
          filters: [{ input: { query: 'field: true', language: 'kuery' }, label: 'Custom label' }],
        },
      };
      const layer: IndexPatternLayer = {
        indexPatternId: '1',
        columnOrder: ['col1', 'col2'],
        columns: {
          col1: {
            ...expectedCol,
            label: 'Custom label',
            customLabel: true,
          },
          col2: {
            label: 'Test reference',
            dataType: 'number',
            isBucketed: false,

            // @ts-expect-error not a valid type
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
        })
      ).toEqual(
        expect.objectContaining({
          columnOrder: ['col2'],
          columns: {
            col2: {
              ...expectedCol,
              label: 'Filters',
              scale: 'ordinal', // added in buildColumn
              params: {
                filters: [{ input: { query: '', language: 'kuery' }, label: '' }],
              },
            },
          },
        })
      );
    });

    it('should delete the inner references when switching away from reference to field-based operation', () => {
      const expectedCol = {
        label: 'Count of records',
        dataType: 'number' as const,
        isBucketed: false,

        operationType: 'count' as const,
        sourceField: 'Records',
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

            // @ts-expect-error not a valid type
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
          op: 'count',
          field: documentField,
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

    it('should reset when switching from one reference to another', () => {
      operationDefinitionMap.secondTest = {
        input: 'fullReference',
        displayName: 'Reference test 2',
        // @ts-expect-error this type is not statically available
        type: 'secondTest',
        requiredReferences: [
          {
            // Any numeric metric that isn't also a reference
            input: ['none', 'field'],
            validateMetadata: (meta: OperationMetadata) =>
              meta.dataType === 'number' && !meta.isBucketed,
          },
        ],
        // @ts-expect-error don't want to define valid arguments
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
        getPossibleOperation: jest.fn().mockReturnValue({ dataType: 'number', isBucketed: false }),
      };

      const layer: IndexPatternLayer = {
        indexPatternId: '1',
        columnOrder: ['col1', 'col2'],
        columns: {
          col1: {
            label: 'Count',
            customLabel: true,
            dataType: 'number' as const,
            isBucketed: false,

            operationType: 'count' as const,
            sourceField: 'Records',
          },
          col2: {
            label: 'Test reference',
            dataType: 'number',
            isBucketed: false,

            // @ts-expect-error not a valid type
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
          // @ts-expect-error not statically available
          op: 'secondTest',
        })
      ).toEqual(
        expect.objectContaining({
          columnOrder: ['col2'],
          columns: {
            col2: expect.objectContaining({ references: ['id1'] }),
          },
          incompleteColumns: {},
        })
      );

      delete operationDefinitionMap.secondTest;
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

            // @ts-expect-error not a valid type
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
        })
      ).toEqual(
        expect.objectContaining({
          columnOrder: ['col1', 'col2'],
          columns: {
            col1: expect.objectContaining({
              sourceField: 'Records',
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
                sourceField: 'Records',
                operationType: 'count',
              },
            },
            incompleteColumns: {
              col2: { sourceField: 'other' },
            },
          },
          columnId: 'col2',
        })
      ).toEqual({
        indexPatternId: '1',
        columnOrder: ['col1'],
        columns: {
          col1: {
            ...termsColumn,
            params: {
              ...termsColumn.params,
              orderBy: { type: 'alphabetical' },
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
              sourceField: 'Records',
              operationType: 'count',
            },
          },
        },
        columnId: 'col2',
      });

      expect(operationDefinitionMap.terms.onOtherColumnChanged).toHaveBeenCalledWith(termsColumn, {
        col1: termsColumn,
      });
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
            sourceField: 'Records',
          },
          col2: {
            label: 'Test reference',
            dataType: 'number',
            isBucketed: false,

            // @ts-expect-error not a valid type
            operationType: 'testReference',
            references: ['col1'],
          },
        },
      };
      expect(deleteColumn({ layer, columnId: 'col2' })).toEqual(
        expect.objectContaining({ columnOrder: [], columns: {} })
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
            sourceField: 'Records',
          },
          col2: {
            label: 'Test reference',
            dataType: 'number',
            isBucketed: false,

            // @ts-expect-error not a valid type
            operationType: 'testReference',
            references: ['col1'],
          },
          col3: {
            label: 'Test reference 2',
            dataType: 'number',
            isBucketed: false,

            // @ts-expect-error not a valid type
            operationType: 'testReference',
            references: ['col2'],
          },
        },
      };
      expect(deleteColumn({ layer, columnId: 'col3' })).toEqual(
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

      const state: IndexPatternPrivateState = {
        indexPatternRefs: [],
        existingFields: {},
        indexPatterns: {},
        currentIndexPatternId: '1',
        isFirstExistenceFetch: false,
        layers: {
          first: {
            indexPatternId: '1',
            columnOrder: ['col1'],
            columns: {
              col1: currentColumn,
            },
          },
        },
      };

      expect(
        updateColumnParam({
          state,
          layerId: 'first',
          currentColumn,
          paramName: 'interval',
          value: 'M',
        }).layers.first.columns.col1
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
        operationType: 'avg',
        sourceField: 'bytes',
      };

      const state: IndexPatternPrivateState = {
        indexPatternRefs: [],
        existingFields: {},
        indexPatterns: {},
        currentIndexPatternId: '1',
        isFirstExistenceFetch: false,
        layers: {
          first: {
            indexPatternId: '1',
            columnOrder: ['col1'],
            columns: {
              col1: currentColumn,
            },
          },
        },
      };

      expect(
        updateColumnParam({
          state,
          layerId: 'first',
          currentColumn,
          paramName: 'format',
          value: { id: 'bytes' },
        }).layers.first.columns.col1
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
            },
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
            },
            col2: {
              label: 'Average of bytes',
              dataType: 'number',
              isBucketed: false,

              // Private
              operationType: 'avg',
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
            },
          },
        })
      ).toEqual(['col1', 'col3', 'col2']);
    });

    it('should correctly sort references to other references', () => {
      expect(
        getColumnOrder({
          columnOrder: [],
          indexPatternId: '',
          columns: {
            bucket: {
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
            },
            metric: {
              label: 'Average of bytes',
              dataType: 'number',
              isBucketed: false,

              // Private
              operationType: 'avg',
              sourceField: 'bytes',
            },
            ref2: {
              label: 'Ref2',
              dataType: 'number',
              isBucketed: false,

              // @ts-expect-error only for testing
              operationType: 'testReference',
              references: ['ref1'],
            },
            ref1: {
              label: 'Ref',
              dataType: 'number',
              isBucketed: false,

              // @ts-expect-error only for testing
              operationType: 'testReference',
              references: ['bucket'],
            },
          },
        })
      ).toEqual(['bucket', 'metric', 'ref1', 'ref2']);
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
          avg: {
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
          },
          col2: {
            dataType: 'number',
            isBucketed: false,
            label: '',
            operationType: 'avg',
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
          },
          col2: {
            dataType: 'number',
            isBucketed: false,
            label: '',
            operationType: 'avg',
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

    it('should rewrite column params if that is necessary due to restrictions', () => {
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
          },
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
            timeZone: 'CET',
          },
        },
      });
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
          },
          col2: {
            dataType: 'number',
            isBucketed: false,
            label: '',
            operationType: 'avg',
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
          },
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
    it('should collect errors from the operation definitions', () => {
      const mock = jest.fn().mockReturnValue(['error 1']);
      // @ts-expect-error not statically analyzed
      operationDefinitionMap.testReference.getErrorMessage = mock;
      const errors = getErrorMessages({
        indexPatternId: '1',
        columnOrder: [],
        columns: {
          col1:
            // @ts-expect-error not statically analyzed
            { operationType: 'testReference', references: [] },
        },
      });
      expect(mock).toHaveBeenCalled();
      expect(errors).toHaveLength(1);
    });

    it('should identify missing references', () => {
      const errors = getErrorMessages({
        indexPatternId: '1',
        columnOrder: [],
        columns: {
          col1:
            // @ts-expect-error not statically analyzed yet
            { operationType: 'testReference', references: ['ref1', 'ref2'] },
        },
      });
      expect(errors).toHaveLength(2);
    });

    it('should identify references that are no longer valid', () => {
      // There is only one operation with `none` as the input type
      // @ts-expect-error this function is not valid
      operationDefinitionMap.testReference.requiredReferences = [
        {
          input: ['none'],
          validateMetadata: () => true,
        },
      ];

      const errors = getErrorMessages({
        indexPatternId: '1',
        columnOrder: [],
        columns: {
          // @ts-expect-error incomplete operation
          ref1: {
            dataType: 'string',
            isBucketed: true,
            operationType: 'terms',
          },
          col1: {
            label: '',
            references: ['ref1'],
            // @ts-expect-error tests only
            operationType: 'testReference',
          },
        },
      });
      expect(errors).toHaveLength(1);
    });
  });
});
