/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { DataPublicPluginStart } from '../../../../../../src/plugins/data/public';
import { IndexPatternDimensionEditorProps } from './dimension_panel';
import { onDrop, canHandleDrop } from './droppable';
import { DragContextState } from '../../drag_drop';
import { createMockedDragDropContext } from '../mocks';
import { IUiSettingsClient, SavedObjectsClientContract, HttpSetup, CoreSetup } from 'kibana/public';
import { IStorageWrapper } from 'src/plugins/kibana_utils/public';
import { IndexPatternPrivateState } from '../types';
import { documentField } from '../document_field';
import { OperationMetadata } from '../../types';
import { IndexPatternColumn } from '../operations';
import { getFieldByNameFactory } from '../pure_helpers';

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

const defaultDragging = {
  columnId: 'col2',
  groupId: 'a',
  layerId: 'first',
  id: 'col2',
  humanData: {
    label: 'Column 2',
  },
};

const draggingField = {
  field: { type: 'number', name: 'bytes', aggregatable: true },
  indexPatternId: 'foo',
  id: 'bar',
  humanData: { label: 'Label' },
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
 * - canHandleDrop: Tests for dropping of fields or other dimensions
 * - onDrop: Correct application of drop logic
 */
describe('IndexPatternDimensionEditorPanel', () => {
  let state: IndexPatternPrivateState;
  let setState: jest.Mock;
  let defaultProps: IndexPatternDimensionEditorProps;
  let dragDropContext: DragContextState;

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
      layers: {
        first: {
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
            },
          },
          incompleteColumns: {},
        },
      },
    };

    setState = jest.fn();

    dragDropContext = createMockedDragDropContext();

    defaultProps = {
      state,
      setState,
      dateRange: { fromDate: 'now-1d', toDate: 'now' },
      columnId: 'col1',
      layerId: 'first',
      uniqueLabel: 'stuff',
      filterOperations: () => true,
      storage: {} as IStorageWrapper,
      uiSettings: {} as IUiSettingsClient,
      savedObjectsClient: {} as SavedObjectsClientContract,
      http: {} as HttpSetup,
      data: ({
        fieldFormats: ({
          getType: jest.fn().mockReturnValue({
            id: 'number',
            title: 'Number',
          }),
          getDefaultType: jest.fn().mockReturnValue({
            id: 'bytes',
            title: 'Bytes',
          }),
        } as unknown) as DataPublicPluginStart['fieldFormats'],
      } as unknown) as DataPublicPluginStart,
      core: {} as CoreSetup,
      dimensionGroups: [],
    };

    jest.clearAllMocks();
  });

  it('is not droppable if no drag is happening', () => {
    expect(canHandleDrop({ ...defaultProps, dragDropContext })).toBe(false);
  });

  it('is not droppable if the dragged item has no field', () => {
    expect(
      canHandleDrop({
        ...defaultProps,
        dragDropContext: {
          ...dragDropContext,
          dragging: { name: 'bar', id: 'bar', humanData: { label: 'Label' } },
        },
      })
    ).toBe(false);
  });

  it('is not droppable if field is not supported by filterOperations', () => {
    expect(
      canHandleDrop({
        ...defaultProps,
        dragDropContext: {
          ...dragDropContext,
          dragging: {
            indexPatternId: 'foo',
            field: { type: 'string', name: 'mystring', aggregatable: true },
            id: 'mystring',
            humanData: { label: 'Label' },
          },
        },
        filterOperations: () => false,
      })
    ).toBe(false);
  });

  it('is droppable if the field is supported by filterOperations', () => {
    expect(
      canHandleDrop({
        ...defaultProps,
        dragDropContext: {
          ...dragDropContext,
          dragging: draggingField,
        },
        filterOperations: (op: OperationMetadata) => op.dataType === 'number',
      })
    ).toBe(true);
  });

  it('is not droppable if the field belongs to another index pattern', () => {
    expect(
      canHandleDrop({
        ...defaultProps,
        dragDropContext: {
          ...dragDropContext,
          dragging: {
            field: { type: 'number', name: 'bar', aggregatable: true },
            indexPatternId: 'foo2',
            id: 'bar',
            humanData: { label: 'Label' },
          },
        },
        filterOperations: (op: OperationMetadata) => op.dataType === 'number',
      })
    ).toBe(false);
  });

  it('is not droppable if the dragged field is already in use by this operation', () => {
    expect(
      canHandleDrop({
        ...defaultProps,
        dragDropContext: {
          ...dragDropContext,
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
        },
      })
    ).toBe(false);
  });

  it('is droppable if the dragged column is compatible', () => {
    expect(
      canHandleDrop({
        ...defaultProps,
        dragDropContext: {
          ...dragDropContext,
          dragging: {
            columnId: 'col1',
            groupId: 'a',
            layerId: 'first',
            id: 'col1',
            humanData: { label: 'Label' },
          },
        },
        columnId: 'col2',
      })
    ).toBe(true);
  });

  it('is not droppable if the dragged column is the same as the current column', () => {
    expect(
      canHandleDrop({
        ...defaultProps,
        dragDropContext: {
          ...dragDropContext,
          dragging: defaultDragging,
        },
      })
    ).toBe(false);
  });

  it('is droppable if the dragged column is incompatible', () => {
    expect(
      canHandleDrop({
        ...defaultProps,
        dragDropContext: {
          ...dragDropContext,
          dragging: defaultDragging,
        },
        columnId: 'col2',
        filterOperations: (op: OperationMetadata) => op.dataType === 'number',
      })
    ).toBe(true);
  });

  it('appends the dropped column when a field is dropped', () => {
    onDrop({
      ...defaultProps,
      dragDropContext: {
        ...dragDropContext,
        dragging: draggingField,
      },
      droppedItem: draggingField,
      columnId: 'col2',
      filterOperations: (op: OperationMetadata) => op.dataType === 'number',
      groupId: '1',
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

  it('selects the specific operation that was valid on drop', () => {
    onDrop({
      ...defaultProps,
      dragDropContext: {
        ...dragDropContext,
        dragging: draggingField,
      },
      droppedItem: draggingField,
      columnId: 'col2',
      filterOperations: (op: OperationMetadata) => op.isBucketed,
      groupId: '1',
    });

    expect(setState).toBeCalledTimes(1);
    expect(setState).toHaveBeenCalledWith({
      ...state,
      layers: {
        first: {
          ...state.layers.first,
          columnOrder: ['col2', 'col1'],
          columns: {
            ...state.layers.first.columns,
            col2: expect.objectContaining({
              dataType: 'string',
              sourceField: 'source',
            }),
          },
        },
      },
    });
  });

  it('updates a column when a field is dropped', () => {
    onDrop({
      ...defaultProps,
      dragDropContext: {
        ...dragDropContext,
        dragging: draggingField,
      },
      droppedItem: draggingField,
      filterOperations: (op: OperationMetadata) => op.dataType === 'number',
      groupId: '1',
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

  it('keeps the operation when dropping a different compatible field', () => {
    const dragging = {
      field: { name: 'memory', type: 'number', aggregatable: true },
      indexPatternId: 'foo',
      id: '1',
      humanData: { label: 'Label' },
    };
    onDrop({
      ...defaultProps,
      dragDropContext: {
        ...dragDropContext,
        dragging,
      },
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
      groupId: '1',
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

  it('updates the column id when moving an operation to an empty dimension', () => {
    const dragging = {
      columnId: 'col1',
      groupId: 'a',
      layerId: 'first',
      id: 'bar',
      humanData: { label: 'Label' },
    };

    onDrop({
      ...defaultProps,
      dragDropContext: {
        ...dragDropContext,
        dragging,
      },
      droppedItem: dragging,
      columnId: 'col2',
      groupId: '1',
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
        },
        col3: {
          label: 'Count',
          dataType: 'number',
          isBucketed: false,

          // Private
          operationType: 'count',
          sourceField: 'Records',
        },
      },
    };

    onDrop({
      ...defaultProps,
      dragDropContext: {
        ...dragDropContext,
        dragging: defaultDragging,
      },
      droppedItem: defaultDragging,
      state: testState,
      groupId: '1',
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

  it('copies a dimension if group is the same an isNew is set, respecting bucket metric order', () => {
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
        },
        col3: {
          label: 'Count',
          dataType: 'number',
          isBucketed: false,

          // Private
          operationType: 'count',
          sourceField: 'Records',
        },
      },
    };

    const metricDragging = {
      columnId: 'col3',
      groupId: 'a',
      layerId: 'first',
      id: 'col3',
      humanData: { label: 'Label' },
    };

    onDrop({
      ...defaultProps,
      dragDropContext: {
        ...dragDropContext,
        dragging: metricDragging,
      },
      droppedItem: metricDragging,
      state: testState,
      groupId: 'a',
      isNew: true,
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
      dragDropContext: {
        ...dragDropContext,
        dragging: bucketDragging,
      },
      droppedItem: bucketDragging,
      state: testState,
      groupId: 'a',
      isNew: true,
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

  it('if dnd is reorder, it correctly reorders columns', () => {
    const dragging = {
      columnId: 'col1',
      groupId: 'a',
      layerId: 'first',
      id: 'col1',
      humanData: { label: 'Label' },
    };
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
            } as IndexPatternColumn,
            col2: {
              label: 'Top values of bar',
              dataType: 'number',
              isBucketed: true,
            } as IndexPatternColumn,
            col3: {
              label: 'Top values of memory',
              dataType: 'number',
              isBucketed: true,
            } as IndexPatternColumn,
          },
        },
      },
    };

    const defaultReorderDropParams = {
      ...defaultProps,
      isReorder: true,
      dragDropContext: {
        ...dragDropContext,
        dragging,
      },
      droppedItem: dragging,
      state: testState,
      filterOperations: (op: OperationMetadata) => op.dataType === 'number',
      groupId: 'a',
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
});
