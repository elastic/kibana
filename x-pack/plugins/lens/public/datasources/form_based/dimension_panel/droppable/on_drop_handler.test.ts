/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { onDrop } from './on_drop_handler';
import { FormBasedPrivateState } from '../../types';
import {
  OperationMetadata,
  DropType,
  DatasourceDimensionDropHandlerProps,
} from '../../../../types';
import { FormulaIndexPatternColumn, MedianIndexPatternColumn } from '../../operations';
import { generateId } from '../../../../id_generator';
import {
  mockDataViews,
  mockedLayers,
  mockedDraggedField,
  mockedDndOperations,
  mockedColumns,
} from './mocks';

jest.mock('../../../../id_generator');

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

function getStateWithMultiFieldColumn(state: FormBasedPrivateState) {
  return {
    ...state,
    layers: {
      ...state.layers,
      first: {
        ...state.layers.first,
        columns: {
          col1: mockedColumns.terms2,
        },
      },
    },
  };
}

describe('FormBasedDimensionEditorPanel: onDrop', () => {
  let state: FormBasedPrivateState;
  let setState: jest.Mock;
  let defaultProps: DatasourceDimensionDropHandlerProps<FormBasedPrivateState>;

  beforeEach(() => {
    state = {
      currentIndexPatternId: 'first',
      layers: {
        first: mockedLayers.singleColumnLayer(),
        second: mockedLayers.emptyLayer(),
      },
    };

    setState = jest.fn();

    defaultProps = {
      dropType: 'reorder',
      source: { name: 'bar', id: 'bar', humanData: { label: 'Label' } },
      target: mockedDndOperations.notFiltering,
      state,
      setState,
      targetLayerDimensionGroups: [],
      indexPatterns: mockDataViews(),
    };

    jest.clearAllMocks();
  });

  describe('dropping a field', () => {
    it('updates a column when a field is dropped', () => {
      onDrop({
        ...defaultProps,
        source: mockedDraggedField,
        dropType: 'field_replace',
      });

      expect(setState).toBeCalledTimes(1);
      expect(setState).toHaveBeenCalledWith({
        ...state,
        layers: {
          ...state.layers,
          first: expect.objectContaining({
            columns: expect.objectContaining({
              col1: expect.objectContaining({
                dataType: 'number',
                sourceField: mockedDraggedField.field.name,
              }),
            }),
          }),
        },
      });
    });
    it('selects the specific operation that was valid on drop', () => {
      onDrop({
        ...defaultProps,
        source: mockedDraggedField,
        dropType: 'field_replace',
        target: {
          ...defaultProps.target,
          filterOperations: (op: OperationMetadata) => op.isBucketed,
          columnId: 'col2',
        },
      });

      expect(setState).toBeCalledTimes(1);
      expect(setState).toHaveBeenCalledWith({
        ...state,
        layers: {
          ...state.layers,
          first: {
            ...state.layers.first,
            columnOrder: ['col1', 'col2'],
            columns: {
              ...state.layers.first.columns,
              col2: expect.objectContaining({
                dataType: 'number',
                sourceField: mockedDraggedField.field.name,
              }),
            },
          },
        },
      });
    });
    it('does not re-use an operation if there is another operation available', () => {
      const localState = {
        ...state,
        layers: {
          ...state.layers,
          first: {
            ...state.layers.first,
            columns: {
              ...state.layers.first.columns,
              col1: {
                ...state.layers.first.columns.col1,
                sourceField: mockedDraggedField.field.name,
                operationType: 'median',
              },
            },
          },
        },
      };
      onDrop({
        ...defaultProps,
        state: localState,
        source: mockedDraggedField,
        dropType: 'field_replace',
        target: {
          ...defaultProps.target,
          filterOperations: (op: OperationMetadata) => !op.isBucketed,
          columnId: 'col2',
        },
      });

      expect(setState).toBeCalledTimes(1);
      expect(setState).toHaveBeenCalledWith({
        ...localState,
        layers: {
          ...localState.layers,
          first: {
            ...localState.layers.first,
            columnOrder: ['col1', 'col2'],
            columns: {
              ...localState.layers.first.columns,
              col2: expect.objectContaining({
                operationType: 'average',
                dataType: 'number',
                sourceField: mockedDraggedField.field.name,
              }),
            },
          },
        },
      });
    });
    it('keeps the operation when dropping a different compatible field', () => {
      onDrop({
        ...defaultProps,
        source: {
          humanData: { label: 'Label1' },
          field: { name: 'memory', type: 'number', aggregatable: true },
          indexPatternId: 'first',
          id: '1',
        },
        state: {
          ...state,
          layers: {
            ...state.layers,
            first: {
              indexPatternId: 'first',
              columnOrder: ['col1'],
              columns: {
                col1: mockedColumns.sum,
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
          ...state.layers,
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
        source: mockedDraggedField,
        dropType: 'field_replace',
        target: {
          ...defaultProps.target,
          columnId: 'col2',
          filterOperations: (op: OperationMetadata) => op.dataType === 'number',
        },
      });

      expect(setState).toBeCalledTimes(1);
      expect(setState).toHaveBeenCalledWith({
        ...state,
        layers: {
          ...state.layers,
          first: {
            ...state.layers.first,
            columnOrder: ['col1', 'col2'],
            columns: {
              ...state.layers.first.columns,
              col2: expect.objectContaining({
                dataType: 'number',
                sourceField: mockedDraggedField.field.name,
              }),
            },
          },
        },
      });
    });
    it('dimensionGroups are defined - appends the dropped column in the right place when a field is dropped', () => {
      const testState = { ...state };
      testState.layers.first = { ...mockedLayers.multipleColumnsLayer() };
      // config:
      // a:
      // b: col1, col2, col3
      // c: col4
      // dragging field into newCol in group a

      onDrop({
        ...defaultProps,
        source: mockedDraggedField,
        targetLayerDimensionGroups: dimensionGroups,
        dropType: 'field_add',
        target: {
          ...defaultProps.target,
          filterOperations: (op: OperationMetadata) => op.dataType === 'number',
          groupId: 'a',
          columnId: 'newCol',
        },
      });

      expect(setState).toBeCalledTimes(1);
      expect(setState).toHaveBeenCalledWith({
        ...testState,
        layers: {
          ...testState.layers,
          first: {
            ...testState.layers.first,
            columnOrder: ['newCol', 'col1', 'col2', 'col3', 'col4'],
            columns: {
              newCol: expect.objectContaining({
                dataType: 'number',
                sourceField: mockedDraggedField.field.name,
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
      state = getStateWithMultiFieldColumn(state);
      onDrop({
        ...defaultProps,
        state,
        source: mockedDraggedField,
        dropType: 'field_combine',
      });

      expect(setState).toBeCalledTimes(1);
      expect(setState).toHaveBeenCalledWith({
        ...state,
        layers: {
          ...state.layers,
          first: expect.objectContaining({
            columns: expect.objectContaining({
              col1: expect.objectContaining({
                dataType: 'string',
                sourceField: 'dest',
                params: expect.objectContaining({
                  secondaryFields: [mockedDraggedField.field.name],
                }),
              }),
            }),
          }),
        },
      });
    });
  });

  describe('dropping a dimension', () => {
    it('sets correct order in group for metric and bucket columns when duplicating a column in group', () => {
      const testState: FormBasedPrivateState = {
        ...state,
        layers: {
          ...state.layers,
          first: {
            indexPatternId: 'first',
            columnOrder: ['col1', 'col2', 'col3'],
            columns: {
              col1: mockedColumns.dateHistogram,
              col2: mockedColumns.terms,
              col3: mockedColumns.sum,
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
        source: referenceDragging,
        state: testState,
        dropType: 'duplicate_compatible',
        target: {
          ...defaultProps.target,
          columnId: 'newCol',
        },
      });
      // metric is appended
      expect(setState).toHaveBeenCalledWith({
        ...testState,
        layers: {
          ...testState.layers,
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
        state: testState,
        dropType: 'duplicate_compatible',
        source: bucketDragging,
        target: {
          ...defaultProps.target,
          columnId: 'newCol',
        },
      });

      // bucket is placed after the last existing bucket
      expect(setState).toHaveBeenCalledWith({
        ...testState,
        layers: {
          ...testState.layers,
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
      const testState: FormBasedPrivateState = {
        ...state,
        layers: {
          ...state.layers,
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
              ref1: mockedColumns.count,
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
        source: referenceDragging,
        state: testState,
        dropType: 'duplicate_compatible',
        target: {
          ...defaultProps.target,
          columnId: 'col1Copy',
        },
      });

      expect(setState).toHaveBeenCalledWith({
        ...testState,
        layers: {
          ...testState.layers,
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
      const testState: FormBasedPrivateState = {
        ...state,
        layers: {
          ...state.layers,
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
              ref1: mockedColumns.count,
              ref2: mockedColumns.uniqueCount,
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
        source: metricDragging,
        state: testState,
        dropType: 'duplicate_compatible',
        target: {
          ...defaultProps.target,
          columnId: 'col1Copy',
        },
      });

      expect(setState).toHaveBeenCalledWith({
        ...testState,
        layers: {
          ...testState.layers,
          first: {
            ...testState.layers.first,
            columnOrder: ['col1', 'ref1', 'ref2', 'ref1Copy', 'ref2Copy', 'col1Copy'],
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

    it('when duplicating fullReference column, the referenced columns get duplicated', () => {
      (generateId as jest.Mock).mockReturnValueOnce(`ref1Copy`);
      (generateId as jest.Mock).mockReturnValueOnce(`ref2Copy`);
      const testState: FormBasedPrivateState = {
        ...state,
        layers: {
          ...state.layers,
          first: {
            indexPatternId: '1',
            columnOrder: ['ref2', 'ref1', 'col1'],
            columns: {
              col1: {
                label: 'Test reference',
                dataType: 'number',
                isBucketed: false,
                operationType: 'cumulative_sum',
                references: ['ref1', 'ref2'],
              },
              ref1: mockedColumns.count,
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
        source: refDragging,
        state: testState,
        dropType: 'duplicate_compatible',
        target: {
          ...defaultProps.target,
          columnId: 'col1Copy',
        },
      });

      expect(setState).toHaveBeenCalledWith({
        ...testState,
        layers: {
          ...testState.layers,
          first: {
            ...testState.layers.first,
            columnOrder: ['ref2', 'ref1', 'col1', 'ref1Copy', 'ref2Copy', 'col1Copy'],
            columns: {
              ref1: testState.layers.first.columns.ref1,
              ref2: testState.layers.first.columns.ref2,
              col1: testState.layers.first.columns.col1,
              ref2Copy: { ...testState.layers.first.columns.ref2 },
              ref1Copy: {
                ...testState.layers.first.columns.ref1,
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

    it('sets correct order in group when reordering a column in group', () => {
      const testState = {
        ...state,
        layers: {
          ...state.layers,
          first: {
            indexPatternId: 'first',
            columnOrder: ['col1', 'col2', 'col3'],
            columns: {
              col1: mockedColumns.dateHistogram,
              col2: mockedColumns.terms,
              col3: mockedColumns.terms2,
            },
          },
        },
      };

      const defaultReorderDropParams = {
        ...defaultProps,
        target: {
          ...defaultProps.target,
          filterOperations: (op: OperationMetadata) => op.dataType === 'number',
        },
        source: mockedDndOperations.metric,
        state: testState,
        dropType: 'reorder' as DropType,
      };

      const stateWithColumnOrder = (columnOrder: string[]) => {
        return {
          ...testState,
          layers: {
            ...testState.layers,
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
        target: {
          ...defaultReorderDropParams.target,
          columnId: 'col3',
        },
      });
      expect(setState).toBeCalledTimes(1);
      expect(setState).toHaveBeenCalledWith(stateWithColumnOrder(['col2', 'col3', 'col1']));

      // last element to first
      onDrop({
        ...defaultReorderDropParams,
        target: {
          ...defaultReorderDropParams.target,
          columnId: 'col1',
        },
        source: {
          humanData: { label: 'Label1' },
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
        target: {
          ...defaultReorderDropParams.target,
          columnId: 'col1',
        },
        source: {
          humanData: { label: 'Label1' },
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
        target: {
          ...defaultReorderDropParams.target,
          columnId: 'col3',
        },
        source: {
          humanData: { label: 'Label1' },
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
        source: mockedDndOperations.metric,
        target: {
          ...defaultProps.target,
          columnId: 'col2',
        },
        dropType: 'move_compatible',
      });

      expect(setState).toBeCalledTimes(1);
      expect(setState).toHaveBeenCalledWith({
        ...state,
        layers: {
          ...state.layers,
          first: {
            ...state.layers.first,
            columnOrder: ['col1', 'col2'],
            columns: {
              col1: state.layers.first.columns.col1,
              col2: state.layers.first.columns.col1,
            },
          },
        },
      });
    });

    it('replaces an operation when moving to a populated dimension', () => {
      const testState = { ...state };
      testState.layers.first = {
        indexPatternId: 'first',
        columnOrder: ['col1', 'col2', 'col3'],
        columns: {
          col1: testState.layers.first.columns.col1,
          col2: mockedColumns.terms,
          col3: mockedColumns.count,
        },
      };

      onDrop({
        ...defaultProps,
        source: mockedDndOperations.bucket,
        state: testState,
        dropType: 'replace_compatible',
      });

      expect(setState).toBeCalledTimes(1);
      expect(setState).toHaveBeenCalledWith({
        ...testState,
        layers: {
          ...testState.layers,
          first: {
            ...testState.layers.first,
            columnOrder: ['col1', 'col2', 'col3'],
            columns: {
              col1: testState.layers.first.columns.col2,
              col2: testState.layers.first.columns.col2,
              col3: testState.layers.first.columns.col3,
            },
          },
        },
      });
    });

    it('when combine compatible columns should append dropped column fields into the target one', () => {
      state = getStateWithMultiFieldColumn(state);
      state.layers.first.columns = {
        ...state.layers.first.columns,
        col2: mockedColumns.terms,
      };
      onDrop({
        ...defaultProps,
        state,
        source: {
          columnId: 'col2',
          groupId: 'a',
          layerId: 'first',
          id: 'col2',
          humanData: { label: 'Label' },
        },
        dropType: 'combine_compatible',
        target: {
          ...defaultProps.target,
          columnId: 'col1',
          groupId: 'a',
          filterOperations: (op: OperationMetadata) => op.isBucketed,
        },
      });

      expect(setState).toBeCalledTimes(1);
      expect(setState).toHaveBeenCalledWith({
        ...state,
        layers: {
          ...state.layers,
          first: expect.objectContaining({
            columns: expect.objectContaining({
              col1: expect.objectContaining({
                dataType: 'string',
                sourceField: 'dest',
                params: expect.objectContaining({ secondaryFields: ['src'] }),
              }),
            }),
          }),
        },
      });
    });

    describe('dimension group aware ordering and copying', () => {
      let testState: FormBasedPrivateState;
      beforeEach(() => {
        testState = { ...state };
        testState.layers.first = { ...mockedLayers.multipleColumnsLayer() };
      });

      it('respects groups on moving operations between compatible groups', () => {
        // config:
        // a:
        // b: col1, col2, col3
        // c: col4
        // dragging col2 into newCol in group a
        onDrop({
          ...defaultProps,
          target: {
            ...defaultProps.target,
            columnId: 'newCol',
            groupId: 'a',
          },
          source: mockedDndOperations.bucket,
          state: testState,
          targetLayerDimensionGroups: dimensionGroups,
          dropType: 'move_compatible',
        });

        expect(setState).toBeCalledTimes(1);
        expect(setState).toHaveBeenCalledWith({
          ...testState,
          layers: {
            ...testState.layers,
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

      it('respects groups on duplicating operations between compatible groups', () => {
        // config:
        // a:
        // b: col1, col2, col3
        // c: col4
        // dragging col2 into newCol in group a
        onDrop({
          ...defaultProps,
          target: {
            ...defaultProps.target,
            columnId: 'newCol',
            groupId: 'a',
          },
          source: mockedDndOperations.bucket,
          state: testState,
          targetLayerDimensionGroups: dimensionGroups,
          dropType: 'duplicate_compatible',
        });

        expect(setState).toBeCalledTimes(1);
        expect(setState).toHaveBeenCalledWith({
          ...testState,
          layers: {
            ...testState.layers,
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
          target: {
            ...defaultProps.target,
            columnId: 'col1',
            groupId: 'a',
          },
          source: mockedDndOperations.bucket2,
          state: testState,
          targetLayerDimensionGroups: [
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
            ...testState.layers,
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

      it('respects groups on moving operations if some columns are not listed in groups', () => {
        // config:
        // a: col1,
        // b: col2, col3
        // c: col4
        // col5, col6 not in visualization groups
        // dragging col3 onto col1 in group a
        onDrop({
          ...defaultProps,
          source: mockedDndOperations.bucket2,
          target: {
            ...defaultProps.target,
            columnId: 'col1',
            groupId: 'a',
          },
          state: {
            ...testState,
            layers: {
              ...testState.layers,
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
          targetLayerDimensionGroups: [
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
            ...testState.layers,
            first: {
              ...testState.layers.first,
              columnOrder: ['col1', 'col2', 'col3', 'col4', 'col5', 'col6'],
              columns: {
                col1: testState.layers.first.columns.col3,
                col2: testState.layers.first.columns.col2,
                col3: testState.layers.first.columns.col3,
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
          source: mockedDndOperations.bucket2,
          state: testState,
          target: {
            ...defaultProps.target,
            columnId: 'col1',
            groupId: 'a',
          },
          targetLayerDimensionGroups: [
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
            ...testState.layers,
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
          dropType: 'move_compatible',
          source: mockedDndOperations.metric,
          state: testState,
          target: {
            ...defaultProps.target,
            columnId: 'newCol',
            groupId: 'b',
          },
          targetLayerDimensionGroups: [
            { ...dimensionGroups[0], accessors: [{ columnId: 'col1' }] },
            { ...dimensionGroups[1], accessors: [{ columnId: 'col2' }, { columnId: 'col3' }] },
            { ...dimensionGroups[2] },
          ],
        });

        expect(setState).toBeCalledTimes(1);
        expect(setState).toHaveBeenCalledWith({
          ...testState,
          layers: {
            ...testState.layers,
            first: {
              ...testState.layers.first,
              columnOrder: ['col1', 'col2', 'col3', 'newCol', 'col4'],
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

      it('copies column to the bottom of the current group', () => {
        // config:
        // a: col1
        // b: col2, col3
        // c: col4
        // copying col1 within group a
        onDrop({
          ...defaultProps,
          dropType: 'duplicate_compatible',
          target: {
            ...defaultProps.target,
            columnId: 'newCol',
            groupId: 'a',
          },
          source: mockedDndOperations.metric,
          state: testState,
          targetLayerDimensionGroups: [
            { ...dimensionGroups[0], accessors: [{ columnId: 'col1' }] },
            { ...dimensionGroups[1], accessors: [{ columnId: 'col2' }, { columnId: 'col3' }] },
            { ...dimensionGroups[2] },
          ],
        });

        expect(setState).toBeCalledTimes(1);
        expect(setState).toHaveBeenCalledWith({
          ...testState,
          layers: {
            ...testState.layers,
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
          source: mockedDraggedField,
          target: {
            ...defaultProps.target,
            columnId: 'newCol',
            groupId: 'a',
            filterOperations: (op: OperationMetadata) => op.dataType === 'number',
          },
          targetLayerDimensionGroups: [
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
            ...state.layers,
            first: {
              ...testState.layers.first,
              columnOrder: ['newCol', 'col1', 'col2', 'col3', 'col4'],
              columns: {
                newCol: expect.objectContaining({
                  dataType: 'number',
                  sourceField: mockedDraggedField.field.name,
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
          dropType: 'move_incompatible',
          source: mockedDndOperations.metricC,
          state: testState,
          target: {
            ...defaultProps.target,
            columnId: 'newCol',
            groupId: 'a',
          },
          targetLayerDimensionGroups: [
            { ...dimensionGroups[0], accessors: [{ columnId: 'col1' }] },
            { ...dimensionGroups[1], accessors: [{ columnId: 'col2' }, { columnId: 'col3' }] },
            { ...dimensionGroups[2] },
          ],
        });

        expect(setState).toBeCalledTimes(1);
        expect(setState).toHaveBeenCalledWith({
          ...testState,
          layers: {
            ...testState.layers,
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

      it('copies incompatible column to the bottom of the target group', () => {
        // config:
        // a: col1
        // b: col2, col3
        // c: col4
        // dragging col4 into newCol in group a

        onDrop({
          ...defaultProps,
          dropType: 'duplicate_incompatible',
          source: mockedDndOperations.metricC,
          state: testState,
          target: {
            ...defaultProps.target,
            columnId: 'newCol',
            groupId: 'a',
          },
          targetLayerDimensionGroups: [
            { ...dimensionGroups[0], accessors: [{ columnId: 'col1' }] },
            { ...dimensionGroups[1], accessors: [{ columnId: 'col2' }, { columnId: 'col3' }] },
            { ...dimensionGroups[2] },
          ],
        });

        expect(setState).toBeCalledTimes(1);
        expect(setState).toHaveBeenCalledWith({
          ...testState,
          layers: {
            ...testState.layers,
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
          dropType: 'move_incompatible',
          source: mockedDndOperations.metricC,
          state: testState,
          target: {
            ...defaultProps.target,
            columnId: 'col2',
            groupId: 'b',
          },
          targetLayerDimensionGroups: [
            { ...dimensionGroups[0], accessors: [{ columnId: 'col1' }] },
            { ...dimensionGroups[1], accessors: [{ columnId: 'col2' }, { columnId: 'col3' }] },
            { ...dimensionGroups[2] },
          ],
        });

        expect(setState).toBeCalledTimes(1);
        expect(setState).toHaveBeenCalledWith({
          ...testState,
          layers: {
            ...testState.layers,
            first: {
              ...testState.layers.first,
              columnOrder: ['col1', 'col2', 'col3', 'col4'],
              columns: {
                col1: testState.layers.first.columns.col1,
                col2: {
                  isBucketed: true,
                  label: 'Top 10 values of bytes',
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
                col4: {
                  dataType: 'number',
                  isBucketed: false,
                  label: 'Median of bytes',
                  operationType: 'median',
                  sourceField: 'bytes',
                },
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
          target: {
            ...defaultProps.target,
            columnId: 'col1',
            groupId: 'a',
          },
          source: mockedDndOperations.metricC,
          dropType: 'swap_compatible',
          state: testState,
          targetLayerDimensionGroups: [
            { ...dimensionGroups[0], accessors: [{ columnId: 'col1' }] },
            { ...dimensionGroups[1], accessors: [{ columnId: 'col2' }, { columnId: 'col3' }] },
            { ...dimensionGroups[2] },
          ],
        });

        expect(setState).toBeCalledTimes(1);
        expect(setState).toHaveBeenCalledWith({
          ...testState,
          layers: {
            ...testState.layers,
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
          target: {
            ...defaultProps.target,
            columnId: 'col2',
            groupId: 'b',
          },
          dropType: 'swap_incompatible',
          source: mockedDndOperations.metricC,
          state: testState,
          targetLayerDimensionGroups: [
            { ...dimensionGroups[0], accessors: [{ columnId: 'col1' }] },
            { ...dimensionGroups[1], accessors: [{ columnId: 'col2' }, { columnId: 'col3' }] },
            { ...dimensionGroups[2] },
          ],
        });

        expect(setState).toBeCalledTimes(1);
        expect(setState).toHaveBeenCalledWith({
          ...testState,
          layers: {
            ...testState.layers,
            first: {
              ...testState.layers.first,
              columnOrder: ['col1', 'col2', 'col3', 'col4'],
              columns: {
                col1: testState.layers.first.columns.col1,
                col2: {
                  isBucketed: true,
                  label: 'Top 10 values of bytes',
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

    describe('onDrop between layers', () => {
      const defaultDimensionGroups = [
        {
          groupId: 'x',
          groupLabel: 'Horizontal axis',
          accessors: [],
          supportsMoreColumns: true,
          dataTestSubj: 'lnsXY_xDimensionPanel',
          filterOperations: (op: OperationMetadata) => op.isBucketed,
        },
        {
          groupId: 'y',
          groupLabel: 'Vertical axis',
          accessors: [],
          supportsMoreColumns: true,
          required: true,
          dataTestSubj: 'lnsXY_yDimensionPanel',
          enableDimensionEditor: true,
          filterOperations: (op: OperationMetadata) => !op.isBucketed,
        },
        {
          groupId: 'breakdown',
          groupLabel: 'Break down by',
          accessors: [],
          supportsMoreColumns: true,
          dataTestSubj: 'lnsXY_splitDimensionPanel',
          required: false,
          enableDimensionEditor: true,
          filterOperations: (op: OperationMetadata) => op.isBucketed,
        },
      ];
      describe('simple operations', () => {
        let props: DatasourceDimensionDropHandlerProps<FormBasedPrivateState>;
        beforeEach(() => {
          setState = jest.fn();

          props = {
            indexPatterns: mockDataViews(),
            state: {
              currentIndexPatternId: 'first',
              layers: {
                first: mockedLayers.singleColumnLayer(),
                second: mockedLayers.multipleColumnsLayer('col2', 'col3', 'col4', 'col5'),
              },
            },
            setState: jest.fn(),
            source: {
              id: 'col1',
              humanData: { label: '2' },
              columnId: 'col1',
              groupId: 'x',
              layerId: 'first',
              filterOperations: (op: OperationMetadata) => op.isBucketed,
              indexPatternId: 'indexPattern1',
            },
            target: {
              filterOperations: (op: OperationMetadata) => op.isBucketed,
              columnId: 'newCol',
              groupId: 'x',
              layerId: 'second',
              indexPatternId: 'indexPattern1',
            },
            targetLayerDimensionGroups: defaultDimensionGroups,
            dropType: 'move_compatible',
          };
          jest.clearAllMocks();
        });
        it('doesnt allow dropping for different data views', () => {
          props.state.layers.second.indexPatternId = 'second';
          expect(onDrop(props)).toEqual(false);
          expect(props.setState).not.toHaveBeenCalled();
        });
        it('move_compatible; allows dropping to the compatible group in different layer to empty column', () => {
          expect(onDrop(props)).toEqual(true);
          expect(props.setState).toBeCalledTimes(1);
          expect(props.setState).toHaveBeenCalledWith({
            ...props.state,
            layers: {
              ...props.state.layers,
              second: {
                columnOrder: ['col2', 'col3', 'col4', 'newCol', 'col5'],
                columns: {
                  ...props.state.layers.second.columns,
                  newCol: mockedColumns.dateHistogram,
                },
                indexPatternId: 'first',
              },
            },
          });
        });
        it('duplicate_compatible: allows dropping to the compatible group in different layer to empty column', () => {
          expect(onDrop({ ...props, dropType: 'duplicate_compatible' })).toEqual(true);
          expect(props.setState).toBeCalledTimes(1);
          expect(props.setState).toHaveBeenCalledWith({
            ...props.state,
            layers: {
              ...props.state.layers,
              second: {
                columnOrder: ['col2', 'col3', 'col4', 'newCol', 'col5'],
                columns: {
                  ...props.state.layers.second.columns,
                  newCol: mockedColumns.dateHistogram,
                },
                indexPatternId: 'first',
              },
            },
          });
        });
        it('swap_compatible: allows dropping to compatible group to replace an existing column', () => {
          props = {
            ...props,

            target: {
              ...props.target,
              columnId: 'col4',
              groupId: 'breakdown',
              layerId: 'second',
            },
            dropType: 'swap_compatible',
          };

          expect(onDrop(props)).toEqual(true);
          expect(props.setState).toBeCalledTimes(1);
          expect(props.setState).toHaveBeenCalledWith({
            ...props.state,
            layers: {
              ...props.state.layers,
              first: {
                ...props.state.layers.first,
                columns: {
                  col1: props.state.layers.second.columns.col4,
                },
              },
              second: {
                ...props.state.layers.second,
                columns: {
                  ...props.state.layers.second.columns,
                  col4: props.state.layers.first.columns.col1,
                },
              },
            },
          });
        });
        it('replace_compatible: allows dropping to compatible group to replace an existing column', () => {
          props = {
            ...props,
            target: {
              ...props.target,
              columnId: 'col4',
              groupId: 'breakdown',
              layerId: 'second',
            },
            dropType: 'replace_compatible',
          };
          expect(onDrop(props)).toEqual(true);
          expect(props.setState).toBeCalledTimes(1);
          expect(props.setState).toHaveBeenCalledWith({
            ...props.state,
            layers: {
              ...props.state.layers,
              second: {
                columnOrder: ['col2', 'col3', 'col4', 'col5'],
                columns: {
                  ...props.state.layers.second.columns,
                  col4: mockedColumns.dateHistogram,
                },
                indexPatternId: 'first',
              },
            },
          });
        });
        it('replace_duplicate_compatible: allows dropping to compatible group to replace an existing column', () => {
          props = {
            ...props,
            target: {
              ...props.target,
              columnId: 'col4',
              groupId: 'breakdown',
              layerId: 'second',
            },
            dropType: 'replace_duplicate_compatible',
          };

          expect(onDrop(props)).toEqual(true);
          expect(props.setState).toBeCalledTimes(1);
          expect(props.setState).toHaveBeenCalledWith({
            ...props.state,
            layers: {
              ...props.state.layers,
              second: {
                columnOrder: ['col2', 'col3', 'col4', 'col5'],
                columns: {
                  ...props.state.layers.second.columns,
                  col4: mockedColumns.dateHistogram,
                },
                indexPatternId: 'first',
              },
            },
          });
        });
        it('replace_duplicate_incompatible: allows dropping to compatible group to replace an existing column', () => {
          props = {
            ...props,
            target: {
              ...props.target,
              columnId: 'col5',
              groupId: 'y',
              layerId: 'second',
              filterOperations: (op) => !op.isBucketed,
            },
            dropType: 'replace_duplicate_incompatible',
          };

          expect(onDrop(props)).toEqual(true);
          expect(props.setState).toBeCalledTimes(1);
          expect(props.setState).toHaveBeenCalledWith({
            ...props.state,
            layers: {
              ...props.state.layers,
              second: {
                columnOrder: ['col2', 'col3', 'col4', 'col5'],
                columns: {
                  ...props.state.layers.second.columns,
                  col5: {
                    dataType: 'date',
                    isBucketed: false,
                    label: 'Minimum of timestampLabel',
                    operationType: 'min',
                    params: {
                      emptyAsNull: true,
                    },
                    scale: 'ratio',
                    sourceField: 'timestamp',
                  },
                },
                incompleteColumns: {},
                indexPatternId: 'first',
              },
            },
          });
        });
        it('replace_incompatible: allows dropping to compatible group to replace an existing column', () => {
          props = {
            ...props,
            target: {
              ...props.target,
              columnId: 'col5',
              groupId: 'y',
              layerId: 'second',
              filterOperations: (op) => !op.isBucketed,
            },
            dropType: 'replace_incompatible',
          };

          expect(onDrop(props)).toEqual(true);
          expect(props.setState).toBeCalledTimes(1);
          expect(props.setState).toHaveBeenCalledWith({
            ...props.state,
            layers: {
              ...props.state.layers,
              second: {
                columnOrder: ['col2', 'col3', 'col4', 'col5'],
                columns: {
                  ...props.state.layers.second.columns,
                  col5: {
                    dataType: 'date',
                    isBucketed: false,
                    label: 'Minimum of timestampLabel',
                    operationType: 'min',
                    params: {
                      emptyAsNull: true,
                    },
                    scale: 'ratio',
                    sourceField: 'timestamp',
                  },
                },
                incompleteColumns: {},
                indexPatternId: 'first',
              },
            },
          });
        });
        it('move_incompatible: allows dropping to compatible group to replace an existing column', () => {
          props = {
            ...props,
            target: {
              ...props.target,
              columnId: 'newCol',
              groupId: 'y',
              layerId: 'second',
              filterOperations: (op) => !op.isBucketed,
            },
            dropType: 'move_incompatible',
          };

          expect(onDrop(props)).toEqual(true);
          expect(props.setState).toBeCalledTimes(1);
          expect(props.setState).toHaveBeenCalledWith({
            ...props.state,
            layers: {
              ...props.state.layers,
              second: {
                columnOrder: ['col2', 'col3', 'col4', 'col5', 'newCol'],
                columns: {
                  ...props.state.layers.second.columns,
                  newCol: {
                    dataType: 'date',
                    isBucketed: false,
                    label: 'Minimum of timestampLabel',
                    operationType: 'min',
                    params: {
                      emptyAsNull: true,
                    },
                    scale: 'ratio',
                    sourceField: 'timestamp',
                  },
                },
                incompleteColumns: {},
                indexPatternId: 'first',
              },
            },
          });
        });
        it('duplicate_incompatible: allows dropping to compatible group to replace an existing column', () => {
          props = {
            ...props,
            target: {
              ...props.target,
              columnId: 'newCol',
              groupId: 'y',
              layerId: 'second',
              filterOperations: (op) => !op.isBucketed,
            },
            dropType: 'duplicate_incompatible',
          };

          expect(onDrop(props)).toEqual(true);
          expect(props.setState).toBeCalledTimes(1);
          expect(props.setState).toHaveBeenCalledWith({
            ...props.state,
            layers: {
              ...props.state.layers,
              second: {
                columnOrder: ['col2', 'col3', 'col4', 'col5', 'newCol'],
                columns: {
                  ...props.state.layers.second.columns,
                  newCol: {
                    dataType: 'date',
                    isBucketed: false,
                    label: 'Minimum of timestampLabel',
                    operationType: 'min',
                    params: {
                      emptyAsNull: true,
                    },
                    scale: 'ratio',
                    sourceField: 'timestamp',
                  },
                },
                incompleteColumns: {},
                indexPatternId: 'first',
              },
            },
          });
        });
        it('swap_incompatible: allows dropping to compatible group to replace an existing column', () => {
          props = {
            ...props,
            target: {
              ...props.target,
              columnId: 'col5',
              groupId: 'y',
              layerId: 'second',
              filterOperations: (op) => !op.isBucketed,
            },
            dropType: 'swap_incompatible',
          };

          expect(onDrop(props)).toEqual(true);
          expect(props.setState).toBeCalledTimes(1);
          expect(props.setState).toHaveBeenCalledWith({
            ...props.state,
            layers: {
              ...props.state.layers,
              first: {
                ...props.state.layers.first,
                columns: {
                  ...props.state.layers.first.columns,
                  col1: {
                    dataType: 'number',
                    isBucketed: true,
                    label: 'bytes',
                    operationType: 'range',
                    params: {
                      includeEmptyRows: true,
                      maxBars: 'auto',
                      ranges: [
                        {
                          from: 0,
                          label: '',
                          to: 1000,
                        },
                      ],
                      type: 'histogram',
                    },
                    scale: 'interval',
                    sourceField: 'bytes',
                  },
                },
              },
              second: {
                columnOrder: ['col2', 'col3', 'col4', 'col5'],
                columns: {
                  ...props.state.layers.second.columns,
                  col5: {
                    dataType: 'date',
                    isBucketed: false,
                    label: 'Minimum of timestampLabel',
                    operationType: 'min',
                    params: {
                      emptyAsNull: true,
                    },
                    scale: 'ratio',
                    sourceField: 'timestamp',
                  },
                },
                incompleteColumns: {},
                indexPatternId: 'first',
              },
            },
          });
        });
        it('combine_compatible: allows dropping to combine to multiterms', () => {
          onDrop({
            ...props,
            state: {
              ...props.state,
              layers: {
                ...props.state.layers,
                first: {
                  ...props.state.layers.first,
                  columns: {
                    terms1: mockedColumns.terms,
                  },
                },
              },
            },
            source: {
              columnId: 'terms1',
              groupId: 'a',
              layerId: 'first',
              id: 'terms1',
              humanData: { label: 'Label' },
            },
            dropType: 'combine_compatible',
            target: {
              ...props.target,
              columnId: 'col4',
              groupId: 'a',
              filterOperations: (op: OperationMetadata) => op.isBucketed,
            },
          });
          expect(props.setState).toBeCalledTimes(1);
          expect(props.setState).toHaveBeenCalledWith({
            ...props.state,
            layers: expect.objectContaining({
              second: {
                ...props.state.layers.second,
                incompleteColumns: {},
                columns: {
                  ...props.state.layers.second.columns,
                  col4: {
                    dataType: 'string',
                    isBucketed: true,
                    label: 'Top values of dest + 1 other',
                    operationType: 'terms',
                    params: {
                      orderBy: {
                        type: 'alphabetical',
                      },
                      orderDirection: 'desc',
                      parentFormat: {
                        id: 'multi_terms',
                      },
                      secondaryFields: ['src'],
                      size: 10,
                    },
                    sourceField: 'dest',
                  },
                },
              },
            }),
          });
        });
        it('combine_incompatible: allows dropping to combine to multiterms', () => {
          onDrop({
            ...props,
            state: {
              ...props.state,
              layers: {
                ...props.state.layers,
                first: {
                  ...props.state.layers.first,
                  columns: {
                    median: mockedColumns.median,
                  },
                },
              },
            },
            source: {
              columnId: 'median',
              groupId: 'x',
              layerId: 'first',
              id: 'median',
              humanData: { label: 'Label' },
              filterOperations: (op: OperationMetadata) => !op.isBucketed,
            },
            dropType: 'combine_incompatible',
            target: {
              ...props.target,
              columnId: 'col4',
              groupId: 'breakdown',
              filterOperations: (op: OperationMetadata) => op.isBucketed,
            },
          });
          expect(props.setState).toBeCalledTimes(1);
          expect(props.setState).toHaveBeenCalledWith({
            ...props.state,
            layers: expect.objectContaining({
              second: {
                ...props.state.layers.second,
                incompleteColumns: {},
                columns: {
                  ...props.state.layers.second.columns,
                  col4: {
                    dataType: 'string',
                    isBucketed: true,
                    label: 'Top values of dest + 1 other',
                    operationType: 'terms',
                    params: {
                      orderBy: {
                        type: 'alphabetical',
                      },
                      orderDirection: 'desc',
                      parentFormat: {
                        id: 'multi_terms',
                      },
                      secondaryFields: ['bytes'],
                      size: 10,
                    },
                    sourceField: 'dest',
                  },
                },
              },
            }),
          });
        });
      });
      describe('references', () => {
        let props: DatasourceDimensionDropHandlerProps<FormBasedPrivateState>;
        beforeEach(() => {
          props = {
            targetLayerDimensionGroups: defaultDimensionGroups,
            setState: jest.fn(),
            dropType: 'move_compatible',

            indexPatterns: mockDataViews(),
            state: {
              layers: {
                first: {
                  indexPatternId: 'first',
                  columns: {
                    firstColumnX0: {
                      label: 'Part of count()',
                      dataType: 'number',
                      operationType: 'count',
                      isBucketed: false,
                      scale: 'ratio',
                      sourceField: '___records___',
                      customLabel: true,
                    },
                    firstColumn: {
                      label: 'count()',
                      dataType: 'number',
                      operationType: 'formula',
                      isBucketed: false,
                      scale: 'ratio',
                      params: { formula: 'count()' },
                      references: ['firstColumnX0'],
                    } as FormulaIndexPatternColumn,
                  },
                  columnOrder: ['firstColumn', 'firstColumnX0'],
                  incompleteColumns: {},
                },
                second: {
                  indexPatternId: 'first',
                  columns: {
                    secondX0: {
                      label: 'Part of count()',
                      dataType: 'number',
                      operationType: 'count',
                      isBucketed: false,
                      scale: 'ratio',
                      sourceField: '___records___',
                      customLabel: true,
                    },
                    second: {
                      label: 'count()',
                      dataType: 'number',
                      operationType: 'formula',
                      isBucketed: false,
                      scale: 'ratio',
                      params: { formula: 'count()' },
                      references: ['secondX0'],
                    } as FormulaIndexPatternColumn,
                  },
                  columnOrder: ['second', 'secondX0'],
                },
              },
              currentIndexPatternId: 'first',
            },
            source: {
              columnId: 'firstColumn',
              groupId: 'y',
              layerId: 'first',
              id: 'firstColumn',
              humanData: {
                label: 'count()',
              },
            },
            target: {
              columnId: 'newColumn',
              groupId: 'y',
              layerId: 'second',
              filterOperations: (op) => !op.isBucketed,
              indexPatternId: 'test',
            },
          };

          jest.clearAllMocks();
        });

        it('move_compatible; allows dropping to the compatible group in different layer to empty column', () => {
          expect(onDrop(props)).toEqual(true);
          expect(props.setState).toBeCalledTimes(1);
          expect(props.setState).toHaveBeenCalledWith({
            ...props.state,
            layers: {
              ...props.state.layers,
              second: {
                columnOrder: ['second', 'secondX0', 'newColumnX0', 'newColumn'],
                columns: {
                  ...props.state.layers.second.columns,
                  newColumn: {
                    dataType: 'number',
                    isBucketed: false,
                    label: 'count()',
                    operationType: 'formula',
                    params: {
                      formula: 'count()',
                      isFormulaBroken: false,
                    },
                    references: ['newColumnX0'],
                    scale: 'ratio',
                  },
                  newColumnX0: {
                    customLabel: true,
                    dataType: 'number',
                    filter: undefined,
                    isBucketed: false,
                    label: 'Part of count()',
                    operationType: 'count',
                    params: {
                      emptyAsNull: false,
                    },
                    scale: 'ratio',
                    sourceField: '___records___',
                    timeScale: undefined,
                    timeShift: undefined,
                  },
                },
                indexPatternId: 'first',
              },
            },
          });
        });
        it('replace_compatible: allows dropping to compatible group to replace an existing column', () => {
          expect(
            onDrop({
              ...props,
              target: {
                columnId: 'second',
                groupId: 'y',
                layerId: 'second',
                filterOperations: (op) => !op.isBucketed,
                indexPatternId: 'test',
              },
            })
          ).toEqual(true);
          expect(props.setState).toBeCalledTimes(1);
          expect(props.setState).toHaveBeenCalledWith({
            ...props.state,
            layers: {
              ...props.state.layers,
              second: {
                columnOrder: ['second', 'secondX0'],
                columns: {
                  ...props.state.layers.second.columns,
                  second: {
                    dataType: 'number',
                    isBucketed: false,
                    label: 'count()',
                    operationType: 'formula',
                    params: {
                      formula: 'count()',
                      isFormulaBroken: false,
                    },
                    references: ['secondX0'],
                    scale: 'ratio',
                  },
                  secondX0: {
                    customLabel: true,
                    dataType: 'number',
                    filter: undefined,
                    isBucketed: false,
                    label: 'Part of count()',
                    operationType: 'count',
                    params: {
                      emptyAsNull: false,
                    },
                    scale: 'ratio',
                    sourceField: '___records___',
                    timeScale: undefined,
                    timeShift: undefined,
                  },
                },
                indexPatternId: 'first',
              },
            },
          });
        });
      });
    });
  });
});
