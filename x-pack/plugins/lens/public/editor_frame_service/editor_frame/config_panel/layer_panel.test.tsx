/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act } from 'react-dom/test-utils';
import {
  createMockVisualization,
  createMockFramePublicAPI,
  createMockDatasource,
  DatasourceMock,
} from '../../mocks';
import { ChildDragDropProvider, DragDrop } from '../../../drag_drop';
import { EuiFormRow } from '@elastic/eui';
import { mountWithIntl } from '@kbn/test/jest';
import { Visualization } from '../../../types';
import { LayerPanel } from './layer_panel';
import { coreMock } from 'src/core/public/mocks';
import { generateId } from '../../../id_generator';

jest.mock('../../../id_generator');

const defaultContext = {
  dragging: undefined,
  setDragging: jest.fn(),
  setActiveDropTarget: () => {},
  activeDropTarget: undefined,
  keyboardMode: false,
  setKeyboardMode: () => {},
  setA11yMessage: jest.fn(),
  registerDropTarget: jest.fn(),
};

describe('LayerPanel', () => {
  let mockVisualization: jest.Mocked<Visualization>;
  let mockVisualization2: jest.Mocked<Visualization>;

  let mockDatasource: DatasourceMock;

  function getDefaultProps() {
    const frame = createMockFramePublicAPI();
    frame.datasourceLayers = {
      first: mockDatasource.publicAPIMock,
    };
    return {
      layerId: 'first',
      activeVisualization: mockVisualization,
      activeDatasourceId: 'ds1',
      datasourceMap: {
        ds1: mockDatasource,
      },
      datasourceStates: {
        ds1: {
          isLoading: false,
          state: 'state',
        },
      },
      visualizationState: 'state',
      updateVisualization: jest.fn(),
      updateDatasource: jest.fn(),
      updateAll: jest.fn(),
      framePublicAPI: frame,
      isOnlyLayer: true,
      onRemoveLayer: jest.fn(),
      dispatch: jest.fn(),
      core: coreMock.createStart(),
      layerIndex: 0,
      registerNewLayerRef: jest.fn(),
    };
  }

  beforeEach(() => {
    mockVisualization = {
      ...createMockVisualization(),
      id: 'testVis',
      visualizationTypes: [
        {
          icon: 'empty',
          id: 'testVis',
          label: 'TEST1',
        },
      ],
    };

    mockVisualization2 = {
      ...createMockVisualization(),
      id: 'testVis2',
      visualizationTypes: [
        {
          icon: 'empty',
          id: 'testVis2',
          label: 'TEST2',
        },
      ],
    };

    mockVisualization.getLayerIds.mockReturnValue(['first']);
    mockDatasource = createMockDatasource('ds1');
  });

  describe('layer reset and remove', () => {
    it('should show the reset button when single layer', () => {
      const component = mountWithIntl(<LayerPanel {...getDefaultProps()} />);
      expect(component.find('[data-test-subj="lnsLayerRemove"]').first().text()).toContain(
        'Reset layer'
      );
    });

    it('should show the delete button when multiple layers', () => {
      const component = mountWithIntl(<LayerPanel {...getDefaultProps()} isOnlyLayer={false} />);
      expect(component.find('[data-test-subj="lnsLayerRemove"]').first().text()).toContain(
        'Delete layer'
      );
    });

    it('should call the clear callback', () => {
      const cb = jest.fn();
      const component = mountWithIntl(<LayerPanel {...getDefaultProps()} onRemoveLayer={cb} />);
      act(() => {
        component.find('[data-test-subj="lnsLayerRemove"]').first().simulate('click');
      });
      expect(cb).toHaveBeenCalled();
    });
  });

  describe('single group', () => {
    it('should render the non-editable state', () => {
      mockVisualization.getConfiguration.mockReturnValue({
        groups: [
          {
            groupLabel: 'A',
            groupId: 'a',
            accessors: [{ columnId: 'x' }],
            filterOperations: () => true,
            supportsMoreColumns: false,
            dataTestSubj: 'lnsGroup',
          },
        ],
      });

      const component = mountWithIntl(<LayerPanel {...getDefaultProps()} />);
      const group = component.find('.lnsLayerPanel__dimensionContainer[data-test-subj="lnsGroup"]');
      expect(group).toHaveLength(1);
    });

    it('should render the group with a way to add a new column', () => {
      mockVisualization.getConfiguration.mockReturnValue({
        groups: [
          {
            groupLabel: 'A',
            groupId: 'a',
            accessors: [],
            filterOperations: () => true,
            supportsMoreColumns: true,
            dataTestSubj: 'lnsGroup',
          },
        ],
      });

      const component = mountWithIntl(<LayerPanel {...getDefaultProps()} />);
      const group = component.find('.lnsLayerPanel__dimensionContainer[data-test-subj="lnsGroup"]');
      expect(group).toHaveLength(1);
    });

    it('should render the required warning when only one group is configured', () => {
      mockVisualization.getConfiguration.mockReturnValue({
        groups: [
          {
            groupLabel: 'A',
            groupId: 'a',
            accessors: [{ columnId: 'x' }],
            filterOperations: () => true,
            supportsMoreColumns: false,
            dataTestSubj: 'lnsGroup',
          },
          {
            groupLabel: 'B',
            groupId: 'b',
            accessors: [],
            filterOperations: () => true,
            supportsMoreColumns: true,
            dataTestSubj: 'lnsGroup',
            required: true,
          },
        ],
      });

      const component = mountWithIntl(<LayerPanel {...getDefaultProps()} />);

      const group = component
        .find(EuiFormRow)
        .findWhere((e) => e.prop('error')?.props?.children === 'Required dimension');

      expect(group).toHaveLength(1);
    });

    it('should render the datasource and visualization panels inside the dimension container', () => {
      mockVisualization.getConfiguration.mockReturnValueOnce({
        groups: [
          {
            groupLabel: 'A',
            groupId: 'a',
            accessors: [{ columnId: 'newid' }],
            filterOperations: () => true,
            supportsMoreColumns: true,
            dataTestSubj: 'lnsGroup',
            enableDimensionEditor: true,
          },
        ],
      });
      mockVisualization.renderDimensionEditor = jest.fn();

      const component = mountWithIntl(<LayerPanel {...getDefaultProps()} />);
      act(() => {
        component.find('[data-test-subj="lns-empty-dimension"]').first().simulate('click');
      });
      component.update();

      const group = component.find('DimensionContainer').first();
      const panel: React.ReactElement = group.prop('panel');
      expect(panel.props.children).toHaveLength(2);
    });

    it('should not update the visualization if the datasource is incomplete', () => {
      (generateId as jest.Mock).mockReturnValue(`newid`);
      const updateAll = jest.fn();
      const updateDatasource = jest.fn();

      mockVisualization.getConfiguration.mockReturnValue({
        groups: [
          {
            groupLabel: 'A',
            groupId: 'a',
            accessors: [],
            filterOperations: () => true,
            supportsMoreColumns: true,
            dataTestSubj: 'lnsGroup',
          },
        ],
      });

      const component = mountWithIntl(
        <LayerPanel
          {...getDefaultProps()}
          updateDatasource={updateDatasource}
          updateAll={updateAll}
        />
      );

      act(() => {
        component.find('[data-test-subj="lns-empty-dimension"]').first().simulate('click');
      });
      component.update();

      expect(mockDatasource.renderDimensionEditor).toHaveBeenCalledWith(
        expect.any(Element),
        expect.objectContaining({ columnId: 'newid' })
      );
      const stateFn =
        mockDatasource.renderDimensionEditor.mock.calls[
          mockDatasource.renderDimensionEditor.mock.calls.length - 1
        ][1].setState;

      act(() => {
        stateFn({
          indexPatternId: '1',
          columns: {},
          columnOrder: [],
          incompleteColumns: { newId: { operationType: 'count' } },
        });
      });
      expect(updateAll).not.toHaveBeenCalled();

      act(() => {
        stateFn(
          {
            indexPatternId: '1',
            columns: {},
            columnOrder: [],
          },
          { shouldReplaceDimension: true }
        );
      });
      expect(updateAll).toHaveBeenCalled();
    });

    it('should keep the DimensionContainer open when configuring a new dimension', () => {
      /**
       * The ID generation system for new dimensions has been messy before, so
       * this tests that the ID used in the first render is used to keep the container
       * open in future renders
       */
      (generateId as jest.Mock).mockReturnValueOnce(`newid`);
      (generateId as jest.Mock).mockReturnValueOnce(`bad`);
      mockVisualization.getConfiguration.mockReturnValueOnce({
        groups: [
          {
            groupLabel: 'A',
            groupId: 'a',
            accessors: [],
            filterOperations: () => true,
            supportsMoreColumns: true,
            dataTestSubj: 'lnsGroup',
          },
        ],
      });
      // Normally the configuration would change in response to a state update,
      // but this test is updating it directly
      mockVisualization.getConfiguration.mockReturnValueOnce({
        groups: [
          {
            groupLabel: 'A',
            groupId: 'a',
            accessors: [{ columnId: 'newid' }],
            filterOperations: () => true,
            supportsMoreColumns: false,
            dataTestSubj: 'lnsGroup',
          },
        ],
      });

      const component = mountWithIntl(<LayerPanel {...getDefaultProps()} />);
      act(() => {
        component.find('[data-test-subj="lns-empty-dimension"]').first().simulate('click');
      });
      component.update();

      expect(component.find('EuiFlyoutHeader').exists()).toBe(true);
    });

    it('should close the DimensionContainer when the active visualization changes', () => {
      /**
       * The ID generation system for new dimensions has been messy before, so
       * this tests that the ID used in the first render is used to keep the container
       * open in future renders
       */

      (generateId as jest.Mock).mockReturnValueOnce(`newid`);
      (generateId as jest.Mock).mockReturnValueOnce(`bad`);
      mockVisualization.getConfiguration.mockReturnValueOnce({
        groups: [
          {
            groupLabel: 'A',
            groupId: 'a',
            accessors: [],
            filterOperations: () => true,
            supportsMoreColumns: true,
            dataTestSubj: 'lnsGroup',
          },
        ],
      });
      // Normally the configuration would change in response to a state update,
      // but this test is updating it directly
      mockVisualization.getConfiguration.mockReturnValue({
        groups: [
          {
            groupLabel: 'A',
            groupId: 'a',
            accessors: [{ columnId: 'newid' }],
            filterOperations: () => true,
            supportsMoreColumns: false,
            dataTestSubj: 'lnsGroup',
          },
        ],
      });

      const component = mountWithIntl(<LayerPanel {...getDefaultProps()} />);

      act(() => {
        component.find('[data-test-subj="lns-empty-dimension"]').first().simulate('click');
      });
      component.update();
      expect(component.find('EuiFlyoutHeader').exists()).toBe(true);
      act(() => {
        component.setProps({ activeVisualization: mockVisualization2 });
      });
      component.update();
      expect(component.find('EuiFlyoutHeader').exists()).toBe(false);
    });

    it('should only update the state on close when needed', () => {
      const updateDatasource = jest.fn();
      mockVisualization.getConfiguration.mockReturnValue({
        groups: [
          {
            groupLabel: 'A',
            groupId: 'a',
            accessors: [{ columnId: 'a' }],
            filterOperations: () => true,
            supportsMoreColumns: false,
            dataTestSubj: 'lnsGroup',
          },
        ],
      });

      const component = mountWithIntl(
        <LayerPanel {...getDefaultProps()} updateDatasource={updateDatasource} />
      );

      // Close without a state update
      mockDatasource.updateStateOnCloseDimension = jest.fn();
      component.find('[data-test-subj="lnsLayerPanel-dimensionLink"]').first().simulate('click');
      act(() => {
        (component.find('DimensionContainer').first().prop('handleClose') as () => void)();
      });
      component.update();
      expect(mockDatasource.updateStateOnCloseDimension).toHaveBeenCalled();
      expect(updateDatasource).not.toHaveBeenCalled();

      // Close with a state update
      mockDatasource.updateStateOnCloseDimension = jest.fn().mockReturnValue({ newState: true });

      component.find('[data-test-subj="lnsLayerPanel-dimensionLink"]').first().simulate('click');
      act(() => {
        (component.find('DimensionContainer').first().prop('handleClose') as () => void)();
      });
      component.update();
      expect(mockDatasource.updateStateOnCloseDimension).toHaveBeenCalled();
      expect(updateDatasource).toHaveBeenCalledWith('ds1', { newState: true });
    });
  });

  // This test is more like an integration test, since the layer panel owns all
  // the coordination between drag and drop
  describe('drag and drop behavior', () => {
    it('should determine if the datasource supports dropping of a field onto empty dimension', () => {
      mockVisualization.getConfiguration.mockReturnValue({
        groups: [
          {
            groupLabel: 'A',
            groupId: 'a',
            accessors: [],
            filterOperations: () => true,
            supportsMoreColumns: true,
            dataTestSubj: 'lnsGroup',
          },
        ],
      });

      mockDatasource.getDropProps.mockReturnValue({
        dropType: 'field_add',
        nextLabel: '',
      });

      const draggingField = {
        field: { name: 'dragged' },
        indexPatternId: 'a',
        id: '1',
        humanData: { label: 'Label' },
        ghost: {
          children: <button>Hello!</button>,
          style: {},
        },
      };

      const component = mountWithIntl(
        <ChildDragDropProvider {...defaultContext} dragging={draggingField}>
          <LayerPanel {...getDefaultProps()} />
        </ChildDragDropProvider>
      );

      expect(mockDatasource.getDropProps).toHaveBeenCalledWith(
        expect.objectContaining({
          dragDropContext: expect.objectContaining({
            dragging: draggingField,
          }),
        })
      );

      component.find('[data-test-subj="lnsGroup"] DragDrop .lnsDragDrop').first().simulate('drop');

      expect(mockDatasource.onDrop).toHaveBeenCalledWith(
        expect.objectContaining({
          dragDropContext: expect.objectContaining({
            dragging: draggingField,
          }),
        })
      );
    });

    it('should determine if the datasource supports dropping of a field onto a pre-filled dimension', () => {
      mockVisualization.getConfiguration.mockReturnValue({
        groups: [
          {
            groupLabel: 'A',
            groupId: 'a',
            accessors: [{ columnId: 'a' }],
            filterOperations: () => true,
            supportsMoreColumns: true,
            dataTestSubj: 'lnsGroup',
          },
        ],
      });

      mockDatasource.getDropProps.mockImplementation(({ columnId }) =>
        columnId !== 'a' ? { dropType: 'field_replace', nextLabel: '' } : undefined
      );

      const draggingField = {
        field: { name: 'dragged' },
        indexPatternId: 'a',
        id: '1',
        humanData: { label: 'Label' },
        ghost: {
          children: <button>Hello!</button>,
          style: {},
        },
      };

      const component = mountWithIntl(
        <ChildDragDropProvider {...defaultContext} dragging={draggingField}>
          <LayerPanel {...getDefaultProps()} />
        </ChildDragDropProvider>
      );

      expect(mockDatasource.getDropProps).toHaveBeenCalledWith(
        expect.objectContaining({ columnId: 'a' })
      );

      expect(
        component.find('[data-test-subj="lnsGroup"] DragDrop').first().prop('dropType')
      ).toEqual(undefined);

      component
        .find('[data-test-subj="lnsGroup"] DragDrop')
        .first()
        .find('.lnsLayerPanel__dimension')
        .simulate('drop');

      expect(mockDatasource.onDrop).not.toHaveBeenCalled();
    });

    it('should allow drag to move between groups', () => {
      (generateId as jest.Mock).mockReturnValue(`newid`);

      mockVisualization.getConfiguration.mockReturnValue({
        groups: [
          {
            groupLabel: 'A',
            groupId: 'a',
            accessors: [{ columnId: 'a' }],
            filterOperations: () => true,
            supportsMoreColumns: false,
            dataTestSubj: 'lnsGroupA',
          },
          {
            groupLabel: 'B',
            groupId: 'b',
            accessors: [{ columnId: 'b' }],
            filterOperations: () => true,
            supportsMoreColumns: true,
            dataTestSubj: 'lnsGroupB',
          },
        ],
      });

      mockDatasource.getDropProps.mockReturnValue({
        dropType: 'replace_compatible',
        nextLabel: '',
      });

      const draggingOperation = {
        layerId: 'first',
        columnId: 'a',
        groupId: 'a',
        id: 'a',
        humanData: { label: 'Label' },
        ghost: {
          children: <button>Hello!</button>,
          style: {},
        },
      };

      const component = mountWithIntl(
        <ChildDragDropProvider {...defaultContext} dragging={draggingOperation}>
          <LayerPanel {...getDefaultProps()} />
        </ChildDragDropProvider>
      );

      expect(mockDatasource.getDropProps).toHaveBeenCalledWith(
        expect.objectContaining({
          dragDropContext: expect.objectContaining({
            dragging: draggingOperation,
          }),
        })
      );

      // Simulate drop on the pre-populated dimension
      component.find('[data-test-subj="lnsGroupB"] DragDrop .lnsDragDrop').at(0).simulate('drop');
      expect(mockDatasource.onDrop).toHaveBeenCalledWith(
        expect.objectContaining({
          columnId: 'b',
          dragDropContext: expect.objectContaining({
            dragging: draggingOperation,
          }),
        })
      );

      // Simulate drop on the empty dimension
      component.find('[data-test-subj="lnsGroupB"] DragDrop .lnsDragDrop').at(1).simulate('drop');
      expect(mockDatasource.onDrop).toHaveBeenCalledWith(
        expect.objectContaining({
          columnId: 'newid',
          dragDropContext: expect.objectContaining({
            dragging: draggingOperation,
          }),
        })
      );
    });

    it('should reorder when dropping in the same group', () => {
      mockVisualization.getConfiguration.mockReturnValue({
        groups: [
          {
            groupLabel: 'A',
            groupId: 'a',
            accessors: [{ columnId: 'a' }, { columnId: 'b' }],
            filterOperations: () => true,
            supportsMoreColumns: true,
            dataTestSubj: 'lnsGroup',
          },
        ],
      });

      const draggingOperation = {
        layerId: 'first',
        columnId: 'a',
        groupId: 'a',
        id: 'a',
        humanData: { label: 'Label' },
        ghost: {
          children: <button>Hello!</button>,
          style: {},
        },
      };

      const component = mountWithIntl(
        <ChildDragDropProvider {...defaultContext} dragging={draggingOperation}>
          <LayerPanel {...getDefaultProps()} />
        </ChildDragDropProvider>
      );
      act(() => {
        component.find(DragDrop).at(1).prop('onDrop')!(draggingOperation, 'reorder');
      });
      expect(mockDatasource.onDrop).toHaveBeenCalledWith(
        expect.objectContaining({
          dropType: 'reorder',
          droppedItem: draggingOperation,
        })
      );
      const secondButton = component
        .find(DragDrop)
        .at(1)
        .find('[data-test-subj="lnsDragDrop-keyboardHandler"]')
        .instance();
      const focusedEl = document.activeElement;
      expect(focusedEl).toEqual(secondButton);
    });

    it('should copy when dropping on empty slot in the same group', () => {
      (generateId as jest.Mock).mockReturnValue(`newid`);
      mockVisualization.getConfiguration.mockReturnValue({
        groups: [
          {
            groupLabel: 'A',
            groupId: 'a',
            accessors: [{ columnId: 'a' }, { columnId: 'b' }],
            filterOperations: () => true,
            supportsMoreColumns: true,
            dataTestSubj: 'lnsGroup',
          },
        ],
      });

      const draggingOperation = {
        layerId: 'first',
        columnId: 'a',
        groupId: 'a',
        id: 'a',
        humanData: { label: 'Label' },
        ghost: {
          children: <button>Hello!</button>,
          style: {},
        },
      };

      const component = mountWithIntl(
        <ChildDragDropProvider {...defaultContext} dragging={draggingOperation}>
          <LayerPanel {...getDefaultProps()} />
        </ChildDragDropProvider>
      );
      act(() => {
        component.find(DragDrop).at(2).prop('onDrop')!(draggingOperation, 'duplicate_in_group');
      });
      expect(mockDatasource.onDrop).toHaveBeenCalledWith(
        expect.objectContaining({
          columnId: 'newid',
          dropType: 'duplicate_in_group',
          droppedItem: draggingOperation,
        })
      );
    });

    it('should call onDrop and update visualization when replacing between compatible groups', () => {
      const mockVis = {
        ...mockVisualization,
        removeDimension: jest.fn(),
        setDimension: jest.fn(() => 'modifiedState'),
      };
      mockVis.getConfiguration.mockReturnValue({
        groups: [
          {
            groupLabel: 'A',
            groupId: 'a',
            accessors: [{ columnId: 'a' }, { columnId: 'b' }],
            filterOperations: () => true,
            supportsMoreColumns: true,
            dataTestSubj: 'lnsGroup',
          },
          {
            groupLabel: 'B',
            groupId: 'b',
            accessors: [{ columnId: 'c' }],
            filterOperations: () => true,
            supportsMoreColumns: true,
            dataTestSubj: 'lnsGroup2',
          },
        ],
      });

      const draggingOperation = {
        layerId: 'first',
        columnId: 'a',
        groupId: 'a',
        id: 'a',
        humanData: { label: 'Label' },
      };

      mockDatasource.onDrop.mockReturnValue({ deleted: 'a' });
      const updateVisualization = jest.fn();

      const component = mountWithIntl(
        <ChildDragDropProvider {...defaultContext} dragging={draggingOperation}>
          <LayerPanel
            {...getDefaultProps()}
            updateVisualization={updateVisualization}
            activeVisualization={mockVis}
          />
        </ChildDragDropProvider>
      );
      act(() => {
        component.find(DragDrop).at(3).prop('onDrop')!(draggingOperation, 'replace_compatible');
      });
      expect(mockDatasource.onDrop).toHaveBeenCalledWith(
        expect.objectContaining({
          dropType: 'replace_compatible',
          droppedItem: draggingOperation,
        })
      );
      expect(mockVis.setDimension).toHaveBeenCalledWith({
        columnId: 'c',
        groupId: 'b',
        layerId: 'first',
        prevState: 'state',
      });
      expect(mockVis.removeDimension).toHaveBeenCalledWith(
        expect.objectContaining({
          columnId: 'a',
          layerId: 'first',
          prevState: 'modifiedState',
        })
      );
      expect(updateVisualization).toHaveBeenCalledTimes(1);
    });
  });
});
