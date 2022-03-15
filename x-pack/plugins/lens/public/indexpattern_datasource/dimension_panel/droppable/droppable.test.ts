/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DataPublicPluginStart } from '../../../../../../../src/plugins/data/public';
import { IndexPatternDimensionEditorProps } from '../dimension_panel';
import { onDrop } from './on_drop_handler';
import { getDropProps } from './get_drop_props';
import { IUiSettingsClient, SavedObjectsClientContract, HttpSetup, CoreSetup } from 'kibana/public';
import { IStorageWrapper } from 'src/plugins/kibana_utils/public';
import { IndexPatternLayer, IndexPatternPrivateState } from '../../types';
import { documentField } from '../../document_field';
import { OperationMetadata, DropType } from '../../../types';
import {
  DateHistogramIndexPatternColumn,
  GenericIndexPatternColumn,
  MedianIndexPatternColumn,
  TermsIndexPatternColumn,
} from '../../operations';
import { getFieldByNameFactory } from '../../pure_helpers';
import { generateId } from '../../../id_generator';
import { layerTypes } from '../../../../common';

jest.mock('../../../id_generator');

const fields = [
  {
    name: 'timestamp',
    displayName: 'timestampLabel',
    type: 'date',
    aggregatable: true,
    searchable: true,
    exists: true,
  },
  {
    name: 'bytes',
    displayName: 'bytes',
    type: 'number',
    aggregatable: true,
    searchable: true,
    exists: true,
  },
  {
    name: 'memory',
    displayName: 'memory',
    type: 'number',
    aggregatable: true,
    searchable: true,
    exists: true,
  },
  {
    name: 'source',
    displayName: 'source',
    type: 'string',
    aggregatable: true,
    searchable: true,
    exists: true,
  },
  {
    name: 'src',
    displayName: 'src',
    type: 'string',
    aggregatable: true,
    searchable: true,
    exists: true,
  },
  {
    name: 'dest',
    displayName: 'dest',
    type: 'string',
    aggregatable: true,
    searchable: true,
    exists: true,
  },
  documentField,
];

const expectedIndexPatterns = {
  foo: {
    id: 'foo',
    title: 'my-fake-index-pattern',
    timeFieldName: 'timestamp',
    hasExistence: true,
    hasRestrictions: false,
    fields,
    getFieldByName: getFieldByNameFactory(fields),
  },
};

const dimensionGroups = [
  {
    accessors: [],
    groupId: 'a',
    supportsMoreColumns: true,
    hideGrouping: true,
    groupLabel: '',
    filterOperations: (op: OperationMetadata) => op.isBucketed,
  },
  {
    accessors: [{ columnId: 'col1' }, { columnId: 'col2' }, { columnId: 'col3' }],
    groupId: 'b',
    supportsMoreColumns: true,
    hideGrouping: true,
    groupLabel: '',
    filterOperations: (op: OperationMetadata) => op.isBucketed,
  },
  {
    accessors: [{ columnId: 'col4' }],
    groupId: 'c',
    supportsMoreColumns: true,
    hideGrouping: true,
    groupLabel: '',
    filterOperations: (op: OperationMetadata) => op.isBucketed === false,
  },
];

const oneColumnLayer: IndexPatternLayer = {
  indexPatternId: 'foo',
  columnOrder: ['col1'],
  columns: {
    col1: {
      label: 'Date histogram of timestamp',
      customLabel: true,
      dataType: 'date',
      isBucketed: true,

      // Private
      operationType: 'date_histogram',
      params: {
        interval: '1d',
      },
      sourceField: 'timestamp',
    } as DateHistogramIndexPatternColumn,
  },
  incompleteColumns: {},
};

const multipleColumnsLayer: IndexPatternLayer = {
  indexPatternId: 'foo',
  columnOrder: ['col1', 'col2', 'col3', 'col4'],
  columns: {
    col1: oneColumnLayer.columns.col1,
    col2: {
      label: 'Top values of src',
      dataType: 'string',
      isBucketed: true,
      // Private
      operationType: 'terms',
      params: {
        orderBy: { type: 'alphabetical' },
        orderDirection: 'desc',
        size: 10,
      },
      sourceField: 'src',
    } as TermsIndexPatternColumn,
    col3: {
      label: 'Top values of dest',
      dataType: 'string',
      isBucketed: true,

      // Private
      operationType: 'terms',
      params: {
        orderBy: { type: 'alphabetical' },
        orderDirection: 'desc',
        size: 10,
      },
      sourceField: 'dest',
    } as TermsIndexPatternColumn,
    col4: {
      label: 'Median of bytes',
      dataType: 'number',
      isBucketed: false,

      // Private
      operationType: 'median',
      sourceField: 'bytes',
    },
  },
};

const draggingField = {
  field: { type: 'number', name: 'bytes', aggregatable: true },
  indexPatternId: 'foo',
  id: 'bar',
  humanData: { label: 'Label' },
};

const draggingCol1 = {
  columnId: 'col1',
  groupId: 'a',
  layerId: 'first',
  id: 'col1',
  humanData: { label: 'Column 1' },
};

const draggingCol2 = {
  columnId: 'col2',
  groupId: 'b',
  layerId: 'first',
  id: 'col2',
  humanData: { label: 'Column 2' },
  filterOperations: (op: OperationMetadata) => op.isBucketed,
};

const draggingCol3 = {
  columnId: 'col3',
  groupId: 'b',
  layerId: 'first',
  id: 'col3',
  humanData: {
    label: '',
  },
};

const draggingCol4 = {
  columnId: 'col4',
  groupId: 'c',
  layerId: 'first',
  id: 'col4',
  humanData: {
    label: '',
  },
  filterOperations: (op: OperationMetadata) => op.isBucketed === false,
};

/**
 * The datasource exposes four main pieces of code which are tested at
 * an integration test level. The main reason for this fairly high level
 * of testing is that there is a lot of UI logic that isn't easily
 * unit tested, such as the transient invalid state.
 *
 * - Dimension trigger: Not tested here
 * - Dimension editor component: First half of the tests
 *
 * - getDropProps: Returns drop types that are possible for the current dragging field or other dimension
 * - onDrop: Correct application of drop logic
 */
describe('IndexPatternDimensionEditorPanel', () => {
  let state: IndexPatternPrivateState;
  let setState: jest.Mock;
  let defaultProps: IndexPatternDimensionEditorProps;

  function getStateWithMultiFieldColumn() {
    return {
      ...state,
      layers: {
        ...state.layers,
        first: {
          ...state.layers.first,
          columns: {
            ...state.layers.first.columns,
            col1: {
              label: 'Top values of dest',
              dataType: 'string',
              isBucketed: true,

              // Private
              operationType: 'terms',
              params: {
                orderBy: { type: 'alphabetical' },
                orderDirection: 'desc',
                size: 10,
              },
              sourceField: 'dest',
            } as TermsIndexPatternColumn,
          },
        },
      },
    };
  }

  beforeEach(() => {
    state = {
      indexPatternRefs: [],
      indexPatterns: expectedIndexPatterns,
      currentIndexPatternId: 'foo',
      isFirstExistenceFetch: false,
      existingFields: {
        'my-fake-index-pattern': {
          timestamp: true,
          bytes: true,
          memory: true,
          source: true,
        },
      },
      layers: { first: { ...oneColumnLayer } },
    };

    setState = jest.fn();

    defaultProps = {
      state,
      setState,
      dateRange: { fromDate: 'now-1d', toDate: 'now' },
      columnId: 'col1',
      layerId: 'first',
      uniqueLabel: 'stuff',
      groupId: 'group1',
      filterOperations: () => true,
      storage: {} as IStorageWrapper,
      uiSettings: {} as IUiSettingsClient,
      savedObjectsClient: {} as SavedObjectsClientContract,
      http: {} as HttpSetup,
      data: {
        fieldFormats: {
          getType: jest.fn().mockReturnValue({
            id: 'number',
            title: 'Number',
          }),
          getDefaultType: jest.fn().mockReturnValue({
            id: 'bytes',
            title: 'Bytes',
          }),
        } as unknown as DataPublicPluginStart['fieldFormats'],
      } as unknown as DataPublicPluginStart,
      core: {} as CoreSetup,
      dimensionGroups: [],
      isFullscreen: false,
      toggleFullscreen: () => {},
      supportStaticValue: false,
      layerType: layerTypes.DATA,
    };

    jest.clearAllMocks();
  });

  const groupId = 'a';

  describe('getDropProps', () => {
    it('returns undefined if no drag is happening', () => {
      expect(
        getDropProps({
          ...defaultProps,
          groupId,
          dragging: { name: 'bar', id: 'bar', humanData: { label: 'Label' } },
        })
      ).toBe(undefined);
    });

    it('returns undefined if the dragged item has no field', () => {
      expect(
        getDropProps({
          ...defaultProps,
          groupId,
          dragging: {
            name: 'bar',
            id: 'bar',
            humanData: { label: 'Label' },
          },
        })
      ).toBe(undefined);
    });

    describe('dragging a field', () => {
      it('returns undefined if field is not supported by filterOperations', () => {
        expect(
          getDropProps({
            ...defaultProps,
            groupId,
            dragging: draggingField,
            filterOperations: () => false,
          })
        ).toBe(undefined);
      });

      it('returns field_replace if the field is supported by filterOperations and the dropTarget is an existing column', () => {
        expect(
          getDropProps({
            ...defaultProps,
            groupId,
            dragging: draggingField,
            filterOperations: (op: OperationMetadata) => op.dataType === 'number',
          })
        ).toEqual({ dropTypes: ['field_replace'], nextLabel: 'Intervals' });
      });

      it('returns field_add if the field is supported by filterOperations and the dropTarget is an empty column', () => {
        expect(
          getDropProps({
            ...defaultProps,
            columnId: 'newId',
            groupId,
            dragging: draggingField,
            filterOperations: (op: OperationMetadata) => op.dataType === 'number',
          })
        ).toEqual({ dropTypes: ['field_add'], nextLabel: 'Intervals' });
      });

      it('returns undefined if the field belongs to another index pattern', () => {
        expect(
          getDropProps({
            ...defaultProps,
            groupId,
            dragging: {
              field: { type: 'number', name: 'bar', aggregatable: true },
              indexPatternId: 'foo2',
              id: 'bar',
              humanData: { label: 'Label' },
            },
            filterOperations: (op: OperationMetadata) => op.dataType === 'number',
          })
        ).toBe(undefined);
      });

      it('returns undefined if the dragged field is already in use by this operation', () => {
        expect(
          getDropProps({
            ...defaultProps,
            groupId,
            dragging: {
              field: {
                name: 'timestamp',
                displayName: 'timestampLabel',
                type: 'date',
                aggregatable: true,
                searchable: true,
                exists: true,
              },
              indexPatternId: 'foo',
              id: 'bar',
              humanData: { label: 'Label' },
            },
          })
        ).toBe(undefined);
      });

      it('returns also field_combine if the field is supported by filterOperations and the dropTarget is an existing column that supports multiple fields', () => {
        // replace the state with a top values column to enable the multi fields behaviour
        state = getStateWithMultiFieldColumn();
        expect(
          getDropProps({
            ...defaultProps,
            state,
            groupId,
            dragging: draggingField,
            filterOperations: (op: OperationMetadata) => op.dataType !== 'date',
          })
        ).toEqual({ dropTypes: ['field_replace', 'field_combine'] });
      });
    });

    describe('dragging a column', () => {
      it('returns undefined if the dragged column from different group uses the same field as the dropTarget', () => {
        state.layers.first = {
          indexPatternId: 'foo',
          columnOrder: ['col1', 'col2', 'col3'],
          columns: {
            col1: state.layers.first.columns.col1,

            col2: {
              label: 'Date histogram of timestamp (1)',
              customLabel: true,
              dataType: 'date',
              isBucketed: true,

              // Private
              operationType: 'date_histogram',
              params: {
                interval: '1d',
              },
              sourceField: 'timestamp',
            } as DateHistogramIndexPatternColumn,
          },
        };

        expect(
          getDropProps({
            ...defaultProps,
            groupId,
            dragging: {
              ...draggingCol1,
              groupId: 'c',
            },
            columnId: 'col2',
          })
        ).toEqual(undefined);
      });

      it('returns undefined if the dragged column from different group uses the same fields as the dropTarget', () => {
        state = getStateWithMultiFieldColumn();
        const sourceMultiFieldColumn = {
          ...state.layers.first.columns.col1,
          sourceField: 'bytes',
          params: {
            ...(state.layers.first.columns.col1 as TermsIndexPatternColumn).params,
            secondaryFields: ['dest'],
          },
        } as TermsIndexPatternColumn;
        // invert the fields
        const targetMultiFieldColumn = {
          ...state.layers.first.columns.col1,
          sourceField: 'dest',
          params: {
            ...(state.layers.first.columns.col1 as TermsIndexPatternColumn).params,
            secondaryFields: ['bytes'],
          },
        } as TermsIndexPatternColumn;
        state.layers.first = {
          indexPatternId: 'foo',
          columnOrder: ['col1', 'col2'],
          columns: {
            col1: sourceMultiFieldColumn,
            col2: targetMultiFieldColumn,
          },
        };

        expect(
          getDropProps({
            ...defaultProps,
            state,
            groupId,
            dragging: {
              ...draggingCol1,
              groupId: 'c',
            },
            columnId: 'col2',
          })
        ).toEqual(undefined);
      });

      it('returns duplicate and replace if the dragged column from different group uses the same field as the dropTarget, but this last one is multifield, and can be swappable', () => {
        state = getStateWithMultiFieldColumn();
        state.layers.first = {
          indexPatternId: 'foo',
          columnOrder: ['col1', 'col2'],
          columns: {
            col1: state.layers.first.columns.col1,

            col2: {
              ...state.layers.first.columns.col1,
              sourceField: 'bytes',
              params: {
                ...(state.layers.first.columns.col1 as TermsIndexPatternColumn).params,
                secondaryFields: ['dest'],
              },
            } as TermsIndexPatternColumn,
          },
        };

        expect(
          getDropProps({
            ...defaultProps,
            state,
            groupId,
            dragging: {
              ...draggingCol1,
              groupId: 'c',
            },
            columnId: 'col2',
          })
        ).toEqual({
          dropTypes: ['replace_compatible', 'replace_duplicate_compatible'],
        });
      });

      it('returns swap, duplicate and replace if the dragged column from different group uses the same field as the dropTarget, but this last one is multifield', () => {
        state = getStateWithMultiFieldColumn();
        state.layers.first = {
          indexPatternId: 'foo',
          columnOrder: ['col1', 'col2'],
          columns: {
            col1: state.layers.first.columns.col1,

            col2: {
              ...state.layers.first.columns.col1,
              sourceField: 'bytes',
              params: {
                ...(state.layers.first.columns.col1 as TermsIndexPatternColumn).params,
                secondaryFields: ['dest'],
              },
            } as TermsIndexPatternColumn,
          },
        };

        expect(
          getDropProps({
            ...defaultProps,
            state,
            // make it swappable
            dimensionGroups: [
              {
                accessors: [{ columnId: 'col1' }],
                filterOperations: jest.fn(() => true),
                groupId,
                groupLabel: '',
                supportsMoreColumns: false,
              },
            ],
            groupId,
            dragging: {
              ...draggingCol1,
              groupId: 'c',
            },
            columnId: 'col2',
          })
        ).toEqual({
          dropTypes: ['replace_compatible', 'replace_duplicate_compatible', 'swap_compatible'],
        });
      });

      it('returns reorder if drop target and droppedItem columns are from the same group and both are existing', () => {
        state.layers.first = {
          indexPatternId: 'foo',
          columnOrder: ['col1', 'col2', 'col3'],
          columns: {
            col1: state.layers.first.columns.col1,

            col2: {
              label: 'Sum of bytes',
              dataType: 'number',
              isBucketed: false,

              // Private
              operationType: 'sum',
              sourceField: 'bytes',
            },
          },
        };

        expect(
          getDropProps({
            ...defaultProps,
            groupId,
            dragging: { ...draggingCol1, groupId },
            columnId: 'col2',
            filterOperations: (op: OperationMetadata) => op.isBucketed === false,
          })
        ).toEqual({
          dropTypes: ['reorder'],
        });
      });

      it('returns duplicate_compatible if drop target and droppedItem columns are from the same group and drop target id is a new column', () => {
        expect(
          getDropProps({
            ...defaultProps,
            columnId: 'newId',
            groupId,
            dragging: {
              ...draggingCol1,
              groupId,
            },
          })
        ).toEqual({ dropTypes: ['duplicate_compatible'] });
      });

      it('returns compatible drop types if the dragged column is compatible', () => {
        expect(
          getDropProps({
            ...defaultProps,
            groupId,
            dragging: {
              ...draggingCol1,
              groupId: 'c',
            },
            columnId: 'col2',
          })
        ).toEqual({ dropTypes: ['move_compatible', 'duplicate_compatible'] });
      });

      it('returns incompatible drop target types if dropping column to existing incompatible column', () => {
        state.layers.first = {
          indexPatternId: 'foo',
          columnOrder: ['col1', 'col2', 'col3'],
          columns: {
            col1: state.layers.first.columns.col1,

            col2: {
              label: 'Sum of bytes',
              dataType: 'number',
              isBucketed: false,

              // Private
              operationType: 'sum',
              sourceField: 'bytes',
            },
          },
        };

        expect(
          getDropProps({
            ...defaultProps,
            groupId,
            dragging: {
              ...draggingCol1,
              groupId: 'c',
            },
            columnId: 'col2',
            filterOperations: (op: OperationMetadata) => op.isBucketed === false,
          })
        ).toEqual({
          dropTypes: [
            'replace_incompatible',
            'replace_duplicate_incompatible',
            'swap_incompatible',
          ],
          nextLabel: 'Minimum',
        });
      });

      it('does not return swap_incompatible if current dropTarget column cannot be swapped to the group of dragging column', () => {
        state.layers.first = {
          indexPatternId: 'foo',
          columnOrder: ['col1', 'col2', 'col3'],
          columns: {
            col1: state.layers.first.columns.col1,

            col2: {
              label: 'Count of records',
              dataType: 'number',
              isBucketed: false,
              sourceField: '___records___',
              operationType: 'count',
            },
          },
        };

        expect(
          getDropProps({
            ...defaultProps,
            groupId,
            dragging: {
              columnId: 'col1',
              groupId: 'b',
              layerId: 'first',
              id: 'col1',
              humanData: { label: 'Label' },
              filterOperations: (op: OperationMetadata) => op.isBucketed === true,
            },
            columnId: 'col2',
            filterOperations: (op: OperationMetadata) => op.isBucketed === false,
          })
        ).toEqual({
          dropTypes: ['replace_incompatible', 'replace_duplicate_incompatible'],
          nextLabel: 'Minimum',
        });
      });

      it('returns combine_compatible drop type if the dragged column is compatible and the target one support multiple fields', () => {
        state = getStateWithMultiFieldColumn();
        state.layers.first = {
          indexPatternId: 'foo',
          columnOrder: ['col1', 'col2'],
          columns: {
            col1: state.layers.first.columns.col1,

            col2: {
              ...state.layers.first.columns.col1,
              sourceField: 'bytes',
            },
          },
        };

        expect(
          getDropProps({
            ...defaultProps,
            state,
            groupId,
            dragging: {
              ...draggingCol1,
              groupId: 'c',
            },
            columnId: 'col2',
          })
        ).toEqual({
          dropTypes: ['replace_compatible', 'replace_duplicate_compatible', 'combine_compatible'],
        });
      });

      it('returns no combine_compatible drop type if the target column uses rarity ordering', () => {
        state = getStateWithMultiFieldColumn();
        state.layers.first = {
          indexPatternId: 'foo',
          columnOrder: ['col1', 'col2'],
          columns: {
            col1: state.layers.first.columns.col1,

            col2: {
              ...state.layers.first.columns.col1,
              sourceField: 'bytes',
              params: {
                ...(state.layers.first.columns.col1 as TermsIndexPatternColumn).params,
                orderBy: { type: 'rare' },
              },
            } as TermsIndexPatternColumn,
          },
        };

        expect(
          getDropProps({
            ...defaultProps,
            state,
            groupId,
            dragging: {
              ...draggingCol1,
              groupId: 'c',
            },
            columnId: 'col2',
          })
        ).toEqual({
          dropTypes: ['replace_compatible', 'replace_duplicate_compatible'],
        });
      });

      it('returns no combine drop type if the dragged column is compatible, the target one supports multiple fields but there are too many fields', () => {
        state = getStateWithMultiFieldColumn();
        state.layers.first = {
          indexPatternId: 'foo',
          columnOrder: ['col1', 'col2'],
          columns: {
            col1: state.layers.first.columns.col1,

            col2: {
              ...state.layers.first.columns.col1,
              sourceField: 'source',
              params: {
                ...(state.layers.first.columns.col1 as TermsIndexPatternColumn).params,
                secondaryFields: ['memory', 'bytes', 'geo.src'], // too many fields here
              },
            } as TermsIndexPatternColumn,
          },
        };

        expect(
          getDropProps({
            ...defaultProps,
            state,
            groupId,
            dragging: {
              ...draggingCol1,
              groupId: 'c',
            },
            columnId: 'col2',
          })
        ).toEqual({
          dropTypes: ['replace_compatible', 'replace_duplicate_compatible'],
        });
      });

      it('returns combine_incompatible drop target types if dropping column to existing incompatible column which supports multiple fields', () => {
        state = getStateWithMultiFieldColumn();
        state.layers.first = {
          indexPatternId: 'foo',
          columnOrder: ['col1', 'col2', 'col3'],
          columns: {
            col1: state.layers.first.columns.col1,

            col2: {
              label: 'Sum of bytes',
              dataType: 'number',
              isBucketed: false,

              // Private
              operationType: 'sum',
              sourceField: 'bytes',
            },
          },
        };

        expect(
          getDropProps({
            ...defaultProps,
            state,
            groupId,
            // drag the sum over the top values
            dragging: {
              ...draggingCol2,
              groupId: 'c',
              filterOperation: undefined,
            },
            columnId: 'col1',
            filterOperations: (op: OperationMetadata) => op.isBucketed,
          })
        ).toEqual({
          dropTypes: [
            'replace_incompatible',
            'replace_duplicate_incompatible',
            'swap_incompatible',
            'combine_incompatible',
          ],
          nextLabel: 'Top values',
        });
      });
    });
  });

  describe('onDrop', () => {
    describe('dropping a field', () => {
      it('updates a column when a field is dropped', () => {
        onDrop({
          ...defaultProps,
          droppedItem: draggingField,
          filterOperations: (op: OperationMetadata) => op.dataType === 'number',
          dropType: 'field_replace',
        });

        expect(setState).toBeCalledTimes(1);
        expect(setState).toHaveBeenCalledWith({
          ...state,
          layers: {
            first: expect.objectContaining({
              columns: expect.objectContaining({
                col1: expect.objectContaining({
                  dataType: 'number',
                  sourceField: 'bytes',
                }),
              }),
            }),
          },
        });
      });
      it('selects the specific operation that was valid on drop', () => {
        onDrop({
          ...defaultProps,
          droppedItem: draggingField,
          columnId: 'col2',
          filterOperations: (op: OperationMetadata) => op.isBucketed,
          dropType: 'field_replace',
        });

        expect(setState).toBeCalledTimes(1);
        expect(setState).toHaveBeenCalledWith({
          ...state,
          layers: {
            first: {
              ...state.layers.first,
              columnOrder: ['col1', 'col2'],
              columns: {
                ...state.layers.first.columns,
                col2: expect.objectContaining({
                  dataType: 'number',
                  sourceField: 'bytes',
                }),
              },
            },
          },
        });
      });
      it('keeps the operation when dropping a different compatible field', () => {
        onDrop({
          ...defaultProps,
          droppedItem: {
            field: { name: 'memory', type: 'number', aggregatable: true },
            indexPatternId: 'foo',
            id: '1',
          },
          state: {
            ...state,
            layers: {
              first: {
                indexPatternId: 'foo',
                columnOrder: ['col1'],
                columns: {
                  col1: {
                    label: 'Sum of bytes',
                    dataType: 'number',
                    isBucketed: false,

                    // Private
                    operationType: 'sum',
                    sourceField: 'bytes',
                  },
                },
              },
            },
          },
          dropType: 'field_replace',
        });

        expect(setState).toBeCalledTimes(1);
        expect(setState).toHaveBeenCalledWith({
          ...state,
          layers: {
            first: expect.objectContaining({
              columns: expect.objectContaining({
                col1: expect.objectContaining({
                  operationType: 'sum',
                  dataType: 'number',
                  sourceField: 'memory',
                }),
              }),
            }),
          },
        });
      });
      it('appends the dropped column when a field is dropped', () => {
        onDrop({
          ...defaultProps,
          droppedItem: draggingField,
          dropType: 'field_replace',
          columnId: 'col2',
          filterOperations: (op: OperationMetadata) => op.dataType === 'number',
        });

        expect(setState).toBeCalledTimes(1);
        expect(setState).toHaveBeenCalledWith({
          ...state,
          layers: {
            first: {
              ...state.layers.first,
              columnOrder: ['col1', 'col2'],
              columns: {
                ...state.layers.first.columns,
                col2: expect.objectContaining({
                  dataType: 'number',
                  sourceField: 'bytes',
                }),
              },
            },
          },
        });
      });
      it('dimensionGroups are defined - appends the dropped column in the right place when a field is dropped', () => {
        const testState = { ...state };
        testState.layers.first = { ...multipleColumnsLayer };
        // config:
        // a:
        // b: col1, col2, col3
        // c: col4
        // dragging field into newCol in group a

        onDrop({
          ...defaultProps,
          droppedItem: draggingField,
          columnId: 'newCol',
          filterOperations: (op: OperationMetadata) => op.dataType === 'number',
          groupId: 'a',
          dimensionGroups,
          dropType: 'field_add',
        });

        expect(setState).toBeCalledTimes(1);
        expect(setState).toHaveBeenCalledWith({
          ...testState,
          layers: {
            first: {
              ...testState.layers.first,
              columnOrder: ['newCol', 'col1', 'col2', 'col3', 'col4'],
              columns: {
                newCol: expect.objectContaining({
                  dataType: 'number',
                  sourceField: 'bytes',
                }),
                col1: testState.layers.first.columns.col1,
                col2: testState.layers.first.columns.col2,
                col3: testState.layers.first.columns.col3,
                col4: testState.layers.first.columns.col4,
              },
              incompleteColumns: {},
            },
          },
        });
      });

      it('appends the new field to the column that supports multiple fields when a field is dropped', () => {
        state = getStateWithMultiFieldColumn();
        onDrop({
          ...defaultProps,
          state,
          droppedItem: draggingField,
          filterOperations: (op: OperationMetadata) => op.dataType === 'number',
          dropType: 'field_combine',
        });

        expect(setState).toBeCalledTimes(1);
        expect(setState).toHaveBeenCalledWith({
          ...state,
          layers: {
            first: expect.objectContaining({
              columns: expect.objectContaining({
                col1: expect.objectContaining({
                  dataType: 'string',
                  sourceField: 'dest',
                  params: expect.objectContaining({ secondaryFields: ['bytes'] }),
                }),
              }),
            }),
          },
        });
      });
    });

    describe('dropping a dimension', () => {
      const dragging = {
        columnId: 'col1',
        groupId: 'a',
        layerId: 'first',
        id: 'col1',
        humanData: { label: 'Label' },
      };

      it('sets correct order in group for metric and bucket columns when duplicating a column in group', () => {
        const testState: IndexPatternPrivateState = {
          ...state,
          layers: {
            first: {
              indexPatternId: 'foo',
              columnOrder: ['col1', 'col2', 'col3'],
              columns: {
                col1: {
                  label: 'Date histogram of timestamp',
                  dataType: 'date',
                  isBucketed: true,
                  operationType: 'date_histogram',
                  params: {
                    interval: '1d',
                  },
                  sourceField: 'timestamp',
                } as DateHistogramIndexPatternColumn,
                col2: {
                  label: 'Top values of bar',
                  dataType: 'number',
                  isBucketed: true,
                  operationType: 'terms',
                  sourceField: 'bar',
                  params: {
                    orderBy: { type: 'alphabetical' },
                    orderDirection: 'asc',
                    size: 5,
                  },
                } as TermsIndexPatternColumn,
                col3: {
                  operationType: 'average',
                  sourceField: 'memory',
                  label: 'average of memory',
                  dataType: 'number',
                  isBucketed: false,
                },
              },
            },
          },
        };

        const referenceDragging = {
          columnId: 'col3',
          groupId: 'a',
          layerId: 'first',
          id: 'col3',
          humanData: { label: 'Label' },
        };

        onDrop({
          ...defaultProps,
          droppedItem: referenceDragging,
          state: testState,
          dropType: 'duplicate_compatible',
          columnId: 'newCol',
        });
        // metric is appended
        expect(setState).toHaveBeenCalledWith({
          ...testState,
          layers: {
            first: {
              ...testState.layers.first,
              columnOrder: ['col1', 'col2', 'col3', 'newCol'],
              columns: {
                col1: testState.layers.first.columns.col1,
                col2: testState.layers.first.columns.col2,
                col3: testState.layers.first.columns.col3,
                newCol: testState.layers.first.columns.col3,
              },
            },
          },
        });

        const bucketDragging = {
          columnId: 'col2',
          groupId: 'a',
          layerId: 'first',
          id: 'col2',
          humanData: { label: 'Label' },
        };

        onDrop({
          ...defaultProps,
          droppedItem: bucketDragging,
          state: testState,
          dropType: 'duplicate_compatible',
          columnId: 'newCol',
        });

        // bucket is placed after the last existing bucket
        expect(setState).toHaveBeenCalledWith({
          ...testState,
          layers: {
            first: {
              ...testState.layers.first,
              columnOrder: ['col1', 'col2', 'newCol', 'col3'],
              columns: {
                col1: testState.layers.first.columns.col1,
                col2: testState.layers.first.columns.col2,
                newCol: testState.layers.first.columns.col2,
                col3: testState.layers.first.columns.col3,
              },
            },
          },
        });
      });

      it('when duplicating fullReference column, the referenced columns get duplicated too', () => {
        (generateId as jest.Mock).mockReturnValue(`ref1Copy`);
        const testState: IndexPatternPrivateState = {
          ...state,
          layers: {
            first: {
              indexPatternId: '1',
              columnOrder: ['col1', 'ref1'],
              columns: {
                col1: {
                  label: 'Test reference',
                  dataType: 'number',
                  isBucketed: false,
                  operationType: 'cumulative_sum',
                  references: ['ref1'],
                },
                ref1: {
                  label: 'Count of records',
                  dataType: 'number',
                  isBucketed: false,
                  sourceField: '___records___',
                  operationType: 'count',
                },
              },
            },
          },
        };
        const referenceDragging = {
          columnId: 'col1',
          groupId: 'a',
          layerId: 'first',
          id: 'col1',
          humanData: { label: 'Label' },
        };
        onDrop({
          ...defaultProps,
          droppedItem: referenceDragging,
          state: testState,
          dropType: 'duplicate_compatible',
          columnId: 'col1Copy',
        });

        expect(setState).toHaveBeenCalledWith({
          ...testState,
          layers: {
            first: {
              ...testState.layers.first,
              columnOrder: ['col1', 'ref1', 'ref1Copy', 'col1Copy'],
              columns: {
                ref1: testState.layers.first.columns.ref1,
                col1: testState.layers.first.columns.col1,
                ref1Copy: { ...testState.layers.first.columns.ref1 },
                col1Copy: {
                  ...testState.layers.first.columns.col1,
                  references: ['ref1Copy'],
                },
              },
            },
          },
        });
      });

      it('when duplicating fullReference column, the multiple referenced columns get duplicated too', () => {
        (generateId as jest.Mock).mockReturnValueOnce(`ref1Copy`);
        (generateId as jest.Mock).mockReturnValueOnce(`ref2Copy`);
        const testState: IndexPatternPrivateState = {
          ...state,
          layers: {
            first: {
              indexPatternId: '1',
              columnOrder: ['col1', 'ref1'],
              columns: {
                col1: {
                  label: 'Test reference',
                  dataType: 'number',
                  isBucketed: false,
                  operationType: 'cumulative_sum',
                  references: ['ref1', 'ref2'],
                },
                ref1: {
                  label: 'Count of records',
                  dataType: 'number',
                  isBucketed: false,
                  sourceField: '___records___',
                  operationType: 'count',
                },
                ref2: {
                  label: 'Unique count of bytes',
                  dataType: 'number',
                  isBucketed: false,
                  sourceField: 'bytes',
                  operationType: 'unique_count',
                },
              },
            },
          },
        };
        const metricDragging = {
          columnId: 'col1',
          groupId: 'a',
          layerId: 'first',
          id: 'col1',
          humanData: { label: 'Label' },
        };
        onDrop({
          ...defaultProps,
          droppedItem: metricDragging,
          state: testState,
          dropType: 'duplicate_compatible',
          columnId: 'col1Copy',
        });

        expect(setState).toHaveBeenCalledWith({
          ...testState,
          layers: {
            first: {
              ...testState.layers.first,
              columnOrder: ['col1', 'ref1', 'ref2', 'ref1Copy', 'col1Copy', 'ref2Copy'],
              columns: {
                ref1: testState.layers.first.columns.ref1,
                ref2: testState.layers.first.columns.ref2,
                col1: testState.layers.first.columns.col1,
                ref2Copy: { ...testState.layers.first.columns.ref2 },
                ref1Copy: { ...testState.layers.first.columns.ref1 },
                col1Copy: {
                  ...testState.layers.first.columns.col1,
                  references: ['ref1Copy', 'ref2Copy'],
                },
              },
            },
          },
        });
      });

      it('when duplicating fullReference column, the referenced columns get duplicated recursively', () => {
        (generateId as jest.Mock).mockReturnValueOnce(`ref1Copy`);
        (generateId as jest.Mock).mockReturnValueOnce(`innerRef1Copy`);
        (generateId as jest.Mock).mockReturnValueOnce(`ref2Copy`);
        const testState: IndexPatternPrivateState = {
          ...state,
          layers: {
            first: {
              indexPatternId: '1',
              columnOrder: ['innerRef1', 'ref2', 'ref1', 'col1'],
              columns: {
                col1: {
                  label: 'Test reference',
                  dataType: 'number',
                  isBucketed: false,
                  operationType: 'cumulative_sum',
                  references: ['ref1', 'ref2'],
                },
                ref1: {
                  label: 'Reference that has a reference',
                  dataType: 'number',
                  isBucketed: false,
                  operationType: 'cumulative_sum',
                  references: ['innerRef1'],
                },
                innerRef1: {
                  label: 'Count of records',
                  dataType: 'number',
                  isBucketed: false,
                  sourceField: '___records___',
                  operationType: 'count',
                },
                ref2: {
                  label: 'Unique count of bytes',
                  dataType: 'number',
                  isBucketed: false,
                  sourceField: 'bytes',
                  operationType: 'unique_count',
                },
              },
            },
          },
        };
        const refDragging = {
          columnId: 'col1',
          groupId: 'a',
          layerId: 'first',
          id: 'col1',
          humanData: { label: 'Label' },
        };
        onDrop({
          ...defaultProps,
          droppedItem: refDragging,
          state: testState,
          dropType: 'duplicate_compatible',
          columnId: 'col1Copy',
        });

        expect(setState).toHaveBeenCalledWith({
          ...testState,
          layers: {
            first: {
              ...testState.layers.first,
              columnOrder: [
                'innerRef1',
                'ref2',
                'ref1',
                'col1',
                'innerRef1Copy',
                'ref1Copy',
                'col1Copy',
                'ref2Copy',
              ],
              columns: {
                innerRef1: testState.layers.first.columns.innerRef1,
                ref1: testState.layers.first.columns.ref1,
                ref2: testState.layers.first.columns.ref2,
                col1: testState.layers.first.columns.col1,

                innerRef1Copy: { ...testState.layers.first.columns.innerRef1 },
                ref2Copy: { ...testState.layers.first.columns.ref2 },
                ref1Copy: {
                  ...testState.layers.first.columns.ref1,
                  references: ['innerRef1Copy'],
                },
                col1Copy: {
                  ...testState.layers.first.columns.col1,
                  references: ['ref1Copy', 'ref2Copy'],
                },
              },
            },
          },
        });
      });

      it('when duplicating fullReference column onto exisitng column, the state will not get modified', () => {
        (generateId as jest.Mock).mockReturnValue(`ref1Copy`);
        const testState: IndexPatternPrivateState = {
          ...state,
          layers: {
            first: {
              indexPatternId: '1',
              columnOrder: ['col2', 'ref1', 'col1'],
              columns: {
                col1: {
                  label: 'Test reference',
                  dataType: 'number',
                  isBucketed: false,
                  operationType: 'cumulative_sum',
                  references: ['ref1'],
                },
                ref1: {
                  label: 'Count of records',
                  dataType: 'number',
                  isBucketed: false,
                  sourceField: '___records___',
                  operationType: 'count',
                },
                col2: {
                  label: 'Minimum',
                  dataType: 'number',
                  isBucketed: false,

                  // Private
                  operationType: 'min',
                  sourceField: 'bytes',
                  customLabel: true,
                },
              },
            },
          },
        };
        const referenceDragging = {
          columnId: 'col1',
          groupId: 'a',
          layerId: 'first',
          id: 'col1',
          humanData: { label: 'Label' },
        };
        onDrop({
          ...defaultProps,
          droppedItem: referenceDragging,
          state: testState,
          dropType: 'duplicate_compatible',
          columnId: 'col2',
        });

        expect(setState).toHaveBeenCalledWith(testState);
      });

      it('sets correct order in group when reordering a column in group', () => {
        const testState = {
          ...state,
          layers: {
            first: {
              indexPatternId: 'foo',
              columnOrder: ['col1', 'col2', 'col3'],
              columns: {
                col1: {
                  label: 'Date histogram of timestamp',
                  dataType: 'date',
                  isBucketed: true,
                } as GenericIndexPatternColumn,
                col2: {
                  label: 'Top values of bar',
                  dataType: 'number',
                  isBucketed: true,
                } as GenericIndexPatternColumn,
                col3: {
                  label: 'Top values of memory',
                  dataType: 'number',
                  isBucketed: true,
                } as GenericIndexPatternColumn,
              },
            },
          },
        };

        const defaultReorderDropParams = {
          ...defaultProps,
          dragging,
          droppedItem: draggingCol1,
          state: testState,
          filterOperations: (op: OperationMetadata) => op.dataType === 'number',
          dropType: 'reorder' as DropType,
        };

        const stateWithColumnOrder = (columnOrder: string[]) => {
          return {
            ...testState,
            layers: {
              first: {
                ...testState.layers.first,
                columnOrder,
                columns: {
                  ...testState.layers.first.columns,
                },
              },
            },
          };
        };

        // first element to last
        onDrop({
          ...defaultReorderDropParams,
          columnId: 'col3',
        });
        expect(setState).toBeCalledTimes(1);
        expect(setState).toHaveBeenCalledWith(stateWithColumnOrder(['col2', 'col3', 'col1']));

        // last element to first
        onDrop({
          ...defaultReorderDropParams,
          columnId: 'col1',
          droppedItem: {
            columnId: 'col3',
            groupId: 'a',
            layerId: 'first',
            id: 'col3',
          },
        });
        expect(setState).toBeCalledTimes(2);
        expect(setState).toHaveBeenCalledWith(stateWithColumnOrder(['col3', 'col1', 'col2']));

        // middle column to first
        onDrop({
          ...defaultReorderDropParams,
          columnId: 'col1',
          droppedItem: {
            columnId: 'col2',
            groupId: 'a',
            layerId: 'first',
            id: 'col2',
          },
        });
        expect(setState).toBeCalledTimes(3);
        expect(setState).toHaveBeenCalledWith(stateWithColumnOrder(['col2', 'col1', 'col3']));

        // middle column to last
        onDrop({
          ...defaultReorderDropParams,
          columnId: 'col3',
          droppedItem: {
            columnId: 'col2',
            groupId: 'a',
            layerId: 'first',
            id: 'col2',
          },
        });
        expect(setState).toBeCalledTimes(4);
        expect(setState).toHaveBeenCalledWith(stateWithColumnOrder(['col1', 'col3', 'col2']));
      });

      it('updates the column id when moving an operation to an empty dimension', () => {
        onDrop({
          ...defaultProps,
          droppedItem: draggingCol1,
          columnId: 'col2',
          dropType: 'move_compatible',
        });

        expect(setState).toBeCalledTimes(1);
        expect(setState).toHaveBeenCalledWith({
          ...state,
          layers: {
            first: {
              ...state.layers.first,
              columnOrder: ['col2'],
              columns: {
                col2: state.layers.first.columns.col1,
              },
            },
          },
        });
      });

      it('replaces an operation when moving to a populated dimension', () => {
        const testState = { ...state };
        testState.layers.first = {
          indexPatternId: 'foo',
          columnOrder: ['col1', 'col2', 'col3'],
          columns: {
            col1: testState.layers.first.columns.col1,

            col2: {
              label: 'Top values of src',
              dataType: 'string',
              isBucketed: true,

              // Private
              operationType: 'terms',
              params: {
                orderBy: { type: 'column', columnId: 'col3' },
                orderDirection: 'desc',
                size: 10,
              },
              sourceField: 'src',
            } as TermsIndexPatternColumn,
            col3: {
              label: 'Count',
              dataType: 'number',
              isBucketed: false,

              // Private
              operationType: 'count',
              sourceField: '___records___',
              customLabel: true,
            },
          },
        };

        onDrop({
          ...defaultProps,
          droppedItem: draggingCol2,
          state: testState,
          dropType: 'replace_compatible',
        });

        expect(setState).toBeCalledTimes(1);
        expect(setState).toHaveBeenCalledWith({
          ...testState,
          layers: {
            first: {
              ...testState.layers.first,
              columnOrder: ['col1', 'col3'],
              columns: {
                col1: testState.layers.first.columns.col2,
                col3: testState.layers.first.columns.col3,
              },
            },
          },
        });
      });

      it('when combine compatible columns should append dropped column fields into the target one', () => {
        state = getStateWithMultiFieldColumn();
        state.layers.first.columns = {
          ...state.layers.first.columns,
          col2: {
            isBucketed: true,
            label: 'Top values of source',
            operationType: 'terms',
            sourceField: 'bytes',
            dataType: 'number',
            params: {
              orderBy: {
                type: 'alphabetical',
              },
              orderDirection: 'desc',
              size: 10,
            },
          } as TermsIndexPatternColumn,
        };
        onDrop({
          ...defaultProps,
          state,
          droppedItem: {
            columnId: 'col2',
            groupId: 'a',
            layerId: 'first',
            id: 'col2',
            humanData: { label: 'Label' },
          },
          filterOperations: (op: OperationMetadata) => op.isBucketed,
          dropType: 'combine_compatible',
          columnId: 'col1',
        });

        expect(setState).toBeCalledTimes(1);
        expect(setState).toHaveBeenCalledWith({
          ...state,
          layers: {
            first: expect.objectContaining({
              columns: expect.objectContaining({
                col1: expect.objectContaining({
                  dataType: 'string',
                  sourceField: 'dest',
                  params: expect.objectContaining({ secondaryFields: ['bytes'] }),
                }),
              }),
            }),
          },
        });
      });

      describe('dimension group aware ordering and copying', () => {
        let testState: IndexPatternPrivateState;
        beforeEach(() => {
          testState = { ...state };
          testState.layers.first = { ...multipleColumnsLayer };
        });

        it('respects groups on moving operations between compatible groups', () => {
          // config:
          // a:
          // b: col1, col2, col3
          // c: col4
          // dragging col2 into newCol in group a
          onDrop({
            ...defaultProps,
            columnId: 'newCol',
            droppedItem: draggingCol2,
            state: testState,
            groupId: 'a',
            dimensionGroups,
            dropType: 'move_compatible',
          });

          expect(setState).toBeCalledTimes(1);
          expect(setState).toHaveBeenCalledWith({
            ...testState,
            layers: {
              first: {
                ...testState.layers.first,
                columnOrder: ['newCol', 'col1', 'col3', 'col4'],
                columns: {
                  newCol: testState.layers.first.columns.col2,
                  col1: testState.layers.first.columns.col1,
                  col3: testState.layers.first.columns.col3,
                  col4: testState.layers.first.columns.col4,
                },
              },
            },
          });
        });

        it('respects groups on duplicating operations between compatible groups', () => {
          // config:
          // a:
          // b: col1, col2, col3
          // c: col4
          // dragging col2 into newCol in group a
          onDrop({
            ...defaultProps,
            columnId: 'newCol',
            droppedItem: draggingCol2,
            state: testState,
            groupId: 'a',
            dimensionGroups,
            dropType: 'duplicate_compatible',
          });

          expect(setState).toBeCalledTimes(1);
          expect(setState).toHaveBeenCalledWith({
            ...testState,
            layers: {
              first: {
                ...testState.layers.first,
                columnOrder: ['newCol', 'col1', 'col2', 'col3', 'col4'],
                columns: {
                  newCol: testState.layers.first.columns.col2,
                  col1: testState.layers.first.columns.col1,
                  col2: testState.layers.first.columns.col2,
                  col3: testState.layers.first.columns.col3,
                  col4: testState.layers.first.columns.col4,
                },
              },
            },
          });
        });

        it('respects groups on moving operations between compatible groups with overwrite', () => {
          // config:
          // a: col1,
          // b: col2, col3
          // c: col4
          // dragging col3 onto col1 in group a
          onDrop({
            ...defaultProps,
            columnId: 'col1',
            droppedItem: draggingCol3,
            state: testState,
            groupId: 'a',
            dimensionGroups: [
              { ...dimensionGroups[0], accessors: [{ columnId: 'col1' }] },
              { ...dimensionGroups[1], accessors: [{ columnId: 'col2' }, { columnId: 'col3' }] },
              { ...dimensionGroups[2] },
            ],
            dropType: 'move_compatible',
          });

          expect(setState).toBeCalledTimes(1);
          expect(setState).toHaveBeenCalledWith({
            ...testState,
            layers: {
              first: {
                ...testState.layers.first,
                columnOrder: ['col1', 'col2', 'col4'],
                columns: {
                  col1: testState.layers.first.columns.col3,
                  col2: testState.layers.first.columns.col2,
                  col4: testState.layers.first.columns.col4,
                },
              },
            },
          });
        });

        it('respects groups on moving operations if some columns are not listed in groups', () => {
          // config:
          // a: col1,
          // b: col2, col3
          // c: col4
          // col5, col6 not in visualization groups
          // dragging col3 onto col1 in group a
          onDrop({
            ...defaultProps,
            columnId: 'col1',
            droppedItem: draggingCol3,
            state: {
              ...testState,
              layers: {
                first: {
                  ...testState.layers.first,
                  columnOrder: ['col1', 'col2', 'col3', 'col4', 'col5', 'col6'],
                  columns: {
                    ...testState.layers.first.columns,
                    col5: {
                      dataType: 'number',
                      operationType: 'count',
                      label: '',
                      isBucketed: false,
                      sourceField: '___records___',
                      customLabel: true,
                    },
                    col6: {
                      dataType: 'number',
                      operationType: 'count',
                      label: '',
                      isBucketed: false,
                      sourceField: '___records___',
                      customLabel: true,
                    },
                  },
                },
              },
            },
            groupId: 'a',
            dimensionGroups: [
              { ...dimensionGroups[0], accessors: [{ columnId: 'col1' }] },
              { ...dimensionGroups[1], accessors: [{ columnId: 'col2' }, { columnId: 'col3' }] },
              { ...dimensionGroups[2] },
            ],
            dropType: 'move_compatible',
          });

          expect(setState).toBeCalledTimes(1);
          expect(setState).toHaveBeenCalledWith({
            ...testState,
            layers: {
              first: {
                ...testState.layers.first,
                columnOrder: ['col1', 'col2', 'col4', 'col5', 'col6'],
                columns: {
                  col1: testState.layers.first.columns.col3,
                  col2: testState.layers.first.columns.col2,
                  col4: testState.layers.first.columns.col4,
                  col5: expect.objectContaining({
                    dataType: 'number',
                    operationType: 'count',
                    label: '',
                    isBucketed: false,
                    sourceField: '___records___',
                  }),
                  col6: expect.objectContaining({
                    dataType: 'number',
                    operationType: 'count',
                    label: '',
                    isBucketed: false,
                    sourceField: '___records___',
                  }),
                },
              },
            },
          });
        });

        it('respects groups on duplicating operations between compatible groups with overwrite', () => {
          // config:
          // a: col1,
          // b: col2, col3
          // c: col4
          // dragging col3 onto col1 in group a

          onDrop({
            ...defaultProps,
            columnId: 'col1',
            droppedItem: draggingCol3,
            state: testState,
            groupId: 'a',
            dimensionGroups: [
              { ...dimensionGroups[0], accessors: [{ columnId: 'col1' }] },
              { ...dimensionGroups[1], accessors: [{ columnId: 'col2' }, { columnId: 'col3' }] },
              { ...dimensionGroups[2] },
            ],
            dropType: 'duplicate_compatible',
          });

          expect(setState).toBeCalledTimes(1);
          expect(setState).toHaveBeenCalledWith({
            ...testState,
            layers: {
              first: {
                ...testState.layers.first,
                columnOrder: ['col1', 'col2', 'col3', 'col4'],
                columns: {
                  col1: testState.layers.first.columns.col3,
                  col2: testState.layers.first.columns.col2,
                  col3: testState.layers.first.columns.col3,
                  col4: testState.layers.first.columns.col4,
                },
              },
            },
          });
        });

        it('moves newly created dimension to the bottom of the current group', () => {
          // config:
          // a: col1
          // b: col2, col3
          // c: col4
          // dragging col1 into newCol in group b
          onDrop({
            ...defaultProps,
            columnId: 'newCol',
            dropType: 'move_compatible',
            droppedItem: draggingCol1,
            state: testState,
            groupId: 'b',
            dimensionGroups: [
              { ...dimensionGroups[0], accessors: [{ columnId: 'col1' }] },
              { ...dimensionGroups[1], accessors: [{ columnId: 'col2' }, { columnId: 'col3' }] },
              { ...dimensionGroups[2] },
            ],
          });

          expect(setState).toBeCalledTimes(1);
          expect(setState).toHaveBeenCalledWith({
            ...testState,
            layers: {
              first: {
                ...testState.layers.first,
                columnOrder: ['col2', 'col3', 'newCol', 'col4'],
                columns: {
                  newCol: testState.layers.first.columns.col1,
                  col2: testState.layers.first.columns.col2,
                  col3: testState.layers.first.columns.col3,
                  col4: testState.layers.first.columns.col4,
                },
              },
            },
          });
        });

        it('copies column to the bottom of the current group', () => {
          // config:
          // a: col1
          // b: col2, col3
          // c: col4
          // copying col1 within group a
          onDrop({
            ...defaultProps,
            columnId: 'newCol',
            dropType: 'duplicate_compatible',
            droppedItem: draggingCol1,
            state: testState,
            groupId: 'a',
            dimensionGroups: [
              { ...dimensionGroups[0], accessors: [{ columnId: 'col1' }] },
              { ...dimensionGroups[1], accessors: [{ columnId: 'col2' }, { columnId: 'col3' }] },
              { ...dimensionGroups[2] },
            ],
          });

          expect(setState).toBeCalledTimes(1);
          expect(setState).toHaveBeenCalledWith({
            ...testState,
            layers: {
              first: {
                ...testState.layers.first,
                columnOrder: ['col1', 'newCol', 'col2', 'col3', 'col4'],
                columns: {
                  col1: testState.layers.first.columns.col1,
                  newCol: testState.layers.first.columns.col1,
                  col2: testState.layers.first.columns.col2,
                  col3: testState.layers.first.columns.col3,
                  col4: testState.layers.first.columns.col4,
                },
              },
            },
          });
        });

        it('appends the dropped column in the right place respecting custom nestingOrder', () => {
          // config:
          // a:
          // b: col1, col2, col3
          // c: col4
          // dragging field into newCol in group a

          onDrop({
            ...defaultProps,
            droppedItem: draggingField,
            columnId: 'newCol',
            filterOperations: (op: OperationMetadata) => op.dataType === 'number',
            groupId: 'a',
            dimensionGroups: [
              // a and b are ordered in reverse visually, but nesting order keeps them in place for column order
              { ...dimensionGroups[1], nestingOrder: 1 },
              { ...dimensionGroups[0], nestingOrder: 0 },
              { ...dimensionGroups[2] },
            ],
            dropType: 'field_add',
          });

          expect(setState).toBeCalledTimes(1);
          expect(setState).toHaveBeenCalledWith({
            ...state,
            layers: {
              first: {
                ...testState.layers.first,
                columnOrder: ['newCol', 'col1', 'col2', 'col3', 'col4'],
                columns: {
                  newCol: expect.objectContaining({
                    dataType: 'number',
                    sourceField: 'bytes',
                  }),
                  col1: testState.layers.first.columns.col1,
                  col2: testState.layers.first.columns.col2,
                  col3: testState.layers.first.columns.col3,
                  col4: testState.layers.first.columns.col4,
                },
                incompleteColumns: {},
              },
            },
          });
        });

        it('moves incompatible column to the bottom of the target group', () => {
          // config:
          // a: col1
          // b: col2, col3
          // c: col4
          // dragging col4 into newCol in group a

          onDrop({
            ...defaultProps,
            columnId: 'newCol',
            dropType: 'move_incompatible',
            droppedItem: draggingCol4,
            state: testState,
            groupId: 'a',
            dimensionGroups: [
              { ...dimensionGroups[0], accessors: [{ columnId: 'col1' }] },
              { ...dimensionGroups[1], accessors: [{ columnId: 'col2' }, { columnId: 'col3' }] },
              { ...dimensionGroups[2] },
            ],
          });

          expect(setState).toBeCalledTimes(1);
          expect(setState).toHaveBeenCalledWith({
            ...testState,
            layers: {
              first: {
                ...testState.layers.first,
                columnOrder: ['col1', 'newCol', 'col2', 'col3'],
                columns: {
                  col1: testState.layers.first.columns.col1,
                  newCol: expect.objectContaining({
                    sourceField: (testState.layers.first.columns.col4 as MedianIndexPatternColumn)
                      .sourceField,
                  }),
                  col2: testState.layers.first.columns.col2,
                  col3: testState.layers.first.columns.col3,
                },
                incompleteColumns: {},
              },
            },
          });
        });

        it('copies incompatible column to the bottom of the target group', () => {
          // config:
          // a: col1
          // b: col2, col3
          // c: col4
          // dragging col4 into newCol in group a

          onDrop({
            ...defaultProps,
            columnId: 'newCol',
            dropType: 'duplicate_incompatible',
            droppedItem: draggingCol4,
            state: testState,
            groupId: 'a',
            dimensionGroups: [
              { ...dimensionGroups[0], accessors: [{ columnId: 'col1' }] },
              { ...dimensionGroups[1], accessors: [{ columnId: 'col2' }, { columnId: 'col3' }] },
              { ...dimensionGroups[2] },
            ],
          });

          expect(setState).toBeCalledTimes(1);
          expect(setState).toHaveBeenCalledWith({
            ...testState,
            layers: {
              first: {
                ...testState.layers.first,
                columnOrder: ['col1', 'newCol', 'col2', 'col3', 'col4'],
                columns: {
                  col1: testState.layers.first.columns.col1,
                  newCol: expect.objectContaining({
                    sourceField: (testState.layers.first.columns.col4 as MedianIndexPatternColumn)
                      .sourceField,
                  }),
                  col2: testState.layers.first.columns.col2,
                  col3: testState.layers.first.columns.col3,
                  col4: testState.layers.first.columns.col4,
                },
                incompleteColumns: {},
              },
            },
          });
        });

        it('moves incompatible column with overwrite keeping order of target column', () => {
          // config:
          // a: col1
          // b: col2, col3
          // c: col4
          // dragging col4 into col2 in group b

          onDrop({
            ...defaultProps,
            columnId: 'col2',
            dropType: 'move_incompatible',
            droppedItem: draggingCol4,
            state: testState,
            groupId: 'b',
            dimensionGroups: [
              { ...dimensionGroups[0], accessors: [{ columnId: 'col1' }] },
              { ...dimensionGroups[1], accessors: [{ columnId: 'col2' }, { columnId: 'col3' }] },
              { ...dimensionGroups[2] },
            ],
          });

          expect(setState).toBeCalledTimes(1);
          expect(setState).toHaveBeenCalledWith({
            ...testState,
            layers: {
              first: {
                ...testState.layers.first,
                columnOrder: ['col1', 'col2', 'col3'],
                columns: {
                  col1: testState.layers.first.columns.col1,
                  col2: {
                    isBucketed: true,
                    label: 'Top values of bytes',
                    operationType: 'terms',
                    sourceField: 'bytes',
                    dataType: 'number',
                    params: {
                      orderBy: {
                        type: 'alphabetical',
                      },
                      orderDirection: 'desc',
                      size: 10,
                      parentFormat: { id: 'terms' },
                    },
                  },
                  col3: testState.layers.first.columns.col3,
                },
                incompleteColumns: {},
              },
            },
          });
        });

        it('when swapping compatibly, columns carry order', () => {
          // config:
          // a: col1
          // b: col2, col3
          // c: col4
          // dragging col4 into col1

          onDrop({
            ...defaultProps,
            columnId: 'col1',
            dropType: 'swap_compatible',
            droppedItem: draggingCol4,
            state: testState,
            groupId: 'a',
            dimensionGroups: [
              { ...dimensionGroups[0], accessors: [{ columnId: 'col1' }] },
              { ...dimensionGroups[1], accessors: [{ columnId: 'col2' }, { columnId: 'col3' }] },
              { ...dimensionGroups[2] },
            ],
          });

          expect(setState).toBeCalledTimes(1);
          expect(setState).toHaveBeenCalledWith({
            ...testState,
            layers: {
              first: {
                ...testState.layers.first,
                columnOrder: ['col1', 'col2', 'col3', 'col4'],
                columns: {
                  col1: testState.layers.first.columns.col4,
                  col2: testState.layers.first.columns.col2,
                  col3: testState.layers.first.columns.col3,
                  col4: testState.layers.first.columns.col1,
                },
              },
            },
          });
        });

        it('when swapping incompatibly, newly created columns take order from the columns they replace', () => {
          // config:
          // a: col1
          // b: col2, col3
          // c: col4
          // dragging col4 into col2

          onDrop({
            ...defaultProps,
            columnId: 'col2',
            dropType: 'swap_incompatible',
            droppedItem: draggingCol4,
            state: testState,
            groupId: 'b',
            dimensionGroups: [
              { ...dimensionGroups[0], accessors: [{ columnId: 'col1' }] },
              { ...dimensionGroups[1], accessors: [{ columnId: 'col2' }, { columnId: 'col3' }] },
              { ...dimensionGroups[2] },
            ],
          });

          expect(setState).toBeCalledTimes(1);
          expect(setState).toHaveBeenCalledWith({
            ...testState,
            layers: {
              first: {
                ...testState.layers.first,
                columnOrder: ['col1', 'col2', 'col3', 'col4'],
                columns: {
                  col1: testState.layers.first.columns.col1,
                  col2: {
                    isBucketed: true,
                    label: 'Top values of bytes',
                    operationType: 'terms',
                    sourceField: 'bytes',
                    dataType: 'number',
                    params: {
                      orderBy: {
                        type: 'alphabetical',
                      },
                      orderDirection: 'desc',
                      parentFormat: { id: 'terms' },
                      size: 10,
                    },
                  },
                  col3: testState.layers.first.columns.col3,
                  col4: {
                    isBucketed: false,
                    label: 'Unique count of src',
                    filter: undefined,
                    operationType: 'unique_count',
                    sourceField: 'src',
                    timeShift: undefined,
                    dataType: 'number',
                    params: {
                      emptyAsNull: true,
                    },
                    scale: 'ratio',
                  },
                },
                incompleteColumns: {},
              },
            },
          });
        });
      });
    });
  });
});
