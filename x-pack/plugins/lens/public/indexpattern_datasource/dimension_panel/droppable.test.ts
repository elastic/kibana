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

jest.mock('../state_helpers');

const expectedIndexPatterns = {
  1: {
    id: '1',
    title: 'my-fake-index-pattern',
    timeFieldName: 'timestamp',
    hasExistence: true,
    hasRestrictions: false,
    fields: [
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
    ],
  },
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
      currentIndexPatternId: '1',
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
          indexPatternId: '1',
          columnOrder: ['col1'],
          columns: {
            col1: {
              label: 'Date histogram of timestamp',
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

  function dragDropState(): IndexPatternPrivateState {
    return {
      indexPatternRefs: [],
      existingFields: {},
      indexPatterns: {
        foo: {
          id: 'foo',
          title: 'Foo pattern',
          hasRestrictions: false,
          fields: [
            {
              aggregatable: true,
              name: 'bar',
              displayName: 'bar',
              searchable: true,
              type: 'number',
            },
            {
              aggregatable: true,
              name: 'mystring',
              displayName: 'mystring',
              searchable: true,
              type: 'string',
            },
          ],
        },
      },
      currentIndexPatternId: '1',
      isFirstExistenceFetch: false,
      layers: {
        myLayer: {
          indexPatternId: 'foo',
          columnOrder: ['col1'],
          columns: {
            col1: {
              label: 'Date histogram of timestamp',
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
        },
      },
    };
  }

  it('is not droppable if no drag is happening', () => {
    expect(
      canHandleDrop({
        ...defaultProps,
        dragDropContext,
        state: dragDropState(),
        layerId: 'myLayer',
      })
    ).toBe(false);
  });

  it('is not droppable if the dragged item has no field', () => {
    expect(
      canHandleDrop({
        ...defaultProps,
        dragDropContext: {
          ...dragDropContext,
          dragging: { name: 'bar', id: 'bar' },
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
          },
        },
        state: dragDropState(),
        filterOperations: () => false,
        layerId: 'myLayer',
      })
    ).toBe(false);
  });

  it('is droppable if the field is supported by filterOperations', () => {
    expect(
      canHandleDrop({
        ...defaultProps,
        dragDropContext: {
          ...dragDropContext,
          dragging: {
            field: { type: 'number', name: 'bar', aggregatable: true },
            indexPatternId: 'foo',
            id: 'bar',
          },
        },
        state: dragDropState(),
        filterOperations: (op: OperationMetadata) => op.dataType === 'number',
        layerId: 'myLayer',
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
          },
        },
        state: dragDropState(),
        filterOperations: (op: OperationMetadata) => op.dataType === 'number',
        layerId: 'myLayer',
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
            layerId: 'myLayer',
            id: 'col1',
          },
        },
        state: dragDropState(),
        columnId: 'col2',
        filterOperations: (op: OperationMetadata) => true,
        layerId: 'myLayer',
      })
    ).toBe(true);
  });

  it('is not droppable if the dragged column is the same as the current column', () => {
    expect(
      canHandleDrop({
        ...defaultProps,
        dragDropContext: {
          ...dragDropContext,
          dragging: {
            columnId: 'col1',
            groupId: 'a',
            layerId: 'myLayer',
            id: 'bar',
          },
        },
        state: dragDropState(),
        columnId: 'col1',
        filterOperations: (op: OperationMetadata) => true,
        layerId: 'myLayer',
      })
    ).toBe(false);
  });

  it('is not droppable if the dragged column is incompatible', () => {
    expect(
      canHandleDrop({
        ...defaultProps,
        dragDropContext: {
          ...dragDropContext,
          dragging: {
            columnId: 'col1',
            groupId: 'a',
            layerId: 'myLayer',
            id: 'bar',
          },
        },
        state: dragDropState(),
        columnId: 'col2',
        filterOperations: (op: OperationMetadata) => op.dataType === 'number',
        layerId: 'myLayer',
      })
    ).toBe(false);
  });

  it('appends the dropped column when a field is dropped', () => {
    const dragging = {
      field: { type: 'number', name: 'bar', aggregatable: true },
      indexPatternId: 'foo',
      id: 'bar',
    };
    const testState = dragDropState();

    onDrop({
      ...defaultProps,
      dragDropContext: {
        ...dragDropContext,
        dragging,
      },
      droppedItem: dragging,
      state: testState,
      columnId: 'col2',
      filterOperations: (op: OperationMetadata) => op.dataType === 'number',
      layerId: 'myLayer',
    });

    expect(setState).toBeCalledTimes(1);
    expect(setState).toHaveBeenCalledWith({
      ...testState,
      layers: {
        myLayer: {
          ...testState.layers.myLayer,
          columnOrder: ['col1', 'col2'],
          columns: {
            ...testState.layers.myLayer.columns,
            col2: expect.objectContaining({
              dataType: 'number',
              sourceField: 'bar',
            }),
          },
        },
      },
    });
  });

  it('selects the specific operation that was valid on drop', () => {
    const dragging = {
      field: { type: 'string', name: 'mystring', aggregatable: true },
      indexPatternId: 'foo',
      id: 'bar',
    };
    const testState = dragDropState();
    onDrop({
      ...defaultProps,
      dragDropContext: {
        ...dragDropContext,
        dragging,
      },
      droppedItem: dragging,
      state: testState,
      columnId: 'col2',
      filterOperations: (op: OperationMetadata) => op.isBucketed,
      layerId: 'myLayer',
    });

    expect(setState).toBeCalledTimes(1);
    expect(setState).toHaveBeenCalledWith({
      ...testState,
      layers: {
        myLayer: {
          ...testState.layers.myLayer,
          columnOrder: ['col1', 'col2'],
          columns: {
            ...testState.layers.myLayer.columns,
            col2: expect.objectContaining({
              dataType: 'string',
              sourceField: 'mystring',
            }),
          },
        },
      },
    });
  });

  it('updates a column when a field is dropped', () => {
    const dragging = {
      field: { type: 'number', name: 'bar', aggregatable: true },
      indexPatternId: 'foo',
      id: 'bar',
    };
    const testState = dragDropState();
    onDrop({
      ...defaultProps,
      dragDropContext: {
        ...dragDropContext,
        dragging,
      },
      droppedItem: dragging,
      state: testState,
      filterOperations: (op: OperationMetadata) => op.dataType === 'number',
      layerId: 'myLayer',
    });

    expect(setState).toBeCalledTimes(1);
    expect(setState).toHaveBeenCalledWith({
      ...testState,
      layers: {
        myLayer: expect.objectContaining({
          columns: expect.objectContaining({
            col1: expect.objectContaining({
              dataType: 'number',
              sourceField: 'bar',
            }),
          }),
        }),
      },
    });
  });

  it('does not set the size of the terms aggregation', () => {
    const dragging = {
      field: { type: 'string', name: 'mystring', aggregatable: true },
      indexPatternId: 'foo',
      id: 'bar',
    };
    const testState = dragDropState();
    onDrop({
      ...defaultProps,
      dragDropContext: {
        ...dragDropContext,
        dragging,
      },
      droppedItem: dragging,
      state: testState,
      columnId: 'col2',
      filterOperations: (op: OperationMetadata) => op.isBucketed,
      layerId: 'myLayer',
    });

    expect(setState).toBeCalledTimes(1);
    expect(setState).toHaveBeenCalledWith({
      ...testState,
      layers: {
        myLayer: {
          ...testState.layers.myLayer,
          columnOrder: ['col1', 'col2'],
          columns: {
            ...testState.layers.myLayer.columns,
            col2: expect.objectContaining({
              operationType: 'terms',
              params: expect.objectContaining({ size: 3 }),
            }),
          },
        },
      },
    });
  });

  it('updates the column id when moving an operation to an empty dimension', () => {
    const dragging = {
      columnId: 'col1',
      groupId: 'a',
      layerId: 'myLayer',
      id: 'bar',
    };
    const testState = dragDropState();

    onDrop({
      ...defaultProps,
      dragDropContext: {
        ...dragDropContext,
        dragging,
      },
      droppedItem: dragging,
      state: testState,
      columnId: 'col2',
      filterOperations: (op: OperationMetadata) => true,
      layerId: 'myLayer',
    });

    expect(setState).toBeCalledTimes(1);
    expect(setState).toHaveBeenCalledWith({
      ...testState,
      layers: {
        myLayer: {
          ...testState.layers.myLayer,
          columnOrder: ['col2'],
          columns: {
            col2: testState.layers.myLayer.columns.col1,
          },
        },
      },
    });
  });

  it('replaces an operation when moving to a populated dimension', () => {
    const dragging = {
      columnId: 'col2',
      groupId: 'a',
      layerId: 'myLayer',
      id: 'col2',
    };
    const testState = dragDropState();
    testState.layers.myLayer = {
      indexPatternId: 'foo',
      columnOrder: ['col1', 'col2', 'col3'],
      columns: {
        col1: testState.layers.myLayer.columns.col1,

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
        dragging,
      },
      droppedItem: dragging,
      state: testState,
      columnId: 'col1',
      filterOperations: (op: OperationMetadata) => true,
      layerId: 'myLayer',
    });

    expect(setState).toBeCalledTimes(1);
    expect(setState).toHaveBeenCalledWith({
      ...testState,
      layers: {
        myLayer: {
          ...testState.layers.myLayer,
          columnOrder: ['col1', 'col3'],
          columns: {
            col1: testState.layers.myLayer.columns.col2,
            col3: testState.layers.myLayer.columns.col3,
          },
        },
      },
    });
  });

  it('if dnd is reorder, it correctly reorders columns', () => {
    const dragging = {
      columnId: 'col1',
      groupId: 'a',
      layerId: 'myLayer',
      id: 'col1',
    };
    const testState = {
      ...dragDropState(),
      layers: {
        myLayer: {
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
      layerId: 'myLayer',
    };

    const stateWithColumnOrder = (columnOrder: string[]) => {
      return {
        ...testState,
        layers: {
          myLayer: {
            ...testState.layers.myLayer,
            columnOrder,
            columns: {
              ...testState.layers.myLayer.columns,
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
        layerId: 'myLayer',
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
        layerId: 'myLayer',
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
        layerId: 'myLayer',
        id: 'col2',
      },
    });
    expect(setState).toBeCalledTimes(4);
    expect(setState).toHaveBeenCalledWith(stateWithColumnOrder(['col1', 'col3', 'col2']));
  });
});
