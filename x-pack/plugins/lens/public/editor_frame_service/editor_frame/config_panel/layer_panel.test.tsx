/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { act } from 'react-dom/test-utils';
import {
  createMockVisualization,
  createMockFramePublicAPI,
  createMockDatasource,
  DatasourceMock,
} from '../../mocks';
import { ChildDragDropProvider, DroppableEvent } from '../../../drag_drop';
import { EuiFormRow } from '@elastic/eui';
import { mountWithIntl } from '@kbn/test/jest';
import { Visualization } from '../../../types';
import { LayerPanel } from './layer_panel';
import { coreMock } from 'src/core/public/mocks';
import { generateId } from '../../../id_generator';

jest.mock('../../../id_generator');

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
      activeVisualizationId: 'vis1',
      visualizationMap: {
        vis1: mockVisualization,
        vis2: mockVisualization2,
      },
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
      index: 0,
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

  it('should fail to render if the public API is out of date', () => {
    const props = getDefaultProps();
    props.framePublicAPI.datasourceLayers = {};
    const component = mountWithIntl(<LayerPanel {...props} />);
    expect(component.isEmptyRender()).toBe(true);
  });

  it('should fail to render if the active visualization is missing', () => {
    const component = mountWithIntl(
      <LayerPanel {...getDefaultProps()} activeVisualizationId="missing" />
    );
    expect(component.isEmptyRender()).toBe(true);
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

      const group = component.find('DragDrop[data-test-subj="lnsGroup"]');
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

      const group = component.find('DragDrop[data-test-subj="lnsGroup"]');
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
      act(() => {
        component.setProps({ activeVisualizationId: 'vis2' });
      });
      component.update();
      expect(component.find('EuiFlyoutHeader').exists()).toBe(false);
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

      mockDatasource.canHandleDrop.mockReturnValue(true);

      const draggingField = { field: { name: 'dragged' }, indexPatternId: 'a', id: '1' };

      const component = mountWithIntl(
        <ChildDragDropProvider dragging={draggingField} setDragging={jest.fn()}>
          <LayerPanel {...getDefaultProps()} />
        </ChildDragDropProvider>
      );

      expect(mockDatasource.canHandleDrop).toHaveBeenCalledWith(
        expect.objectContaining({
          dragDropContext: expect.objectContaining({
            dragging: draggingField,
          }),
        })
      );

      component.find('DragDrop[data-test-subj="lnsGroup"]').first().simulate('drop');

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

      mockDatasource.canHandleDrop.mockImplementation(({ columnId }) => columnId !== 'a');

      const draggingField = { field: { name: 'dragged' }, indexPatternId: 'a', id: '1' };

      const component = mountWithIntl(
        <ChildDragDropProvider dragging={draggingField} setDragging={jest.fn()}>
          <LayerPanel {...getDefaultProps()} />
        </ChildDragDropProvider>
      );

      expect(mockDatasource.canHandleDrop).toHaveBeenCalledWith(
        expect.objectContaining({ columnId: 'a' })
      );

      expect(
        component.find('DragDrop[data-test-subj="lnsGroup"]').first().prop('droppable')
      ).toEqual(false);

      component.find('DragDrop[data-test-subj="lnsGroup"]').first().simulate('drop');

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

      mockDatasource.canHandleDrop.mockReturnValue(true);

      const draggingOperation = { layerId: 'first', columnId: 'a', groupId: 'a', id: 'a' };

      const component = mountWithIntl(
        <ChildDragDropProvider dragging={draggingOperation} setDragging={jest.fn()}>
          <LayerPanel {...getDefaultProps()} />
        </ChildDragDropProvider>
      );

      expect(mockDatasource.canHandleDrop).toHaveBeenCalledTimes(2);
      expect(mockDatasource.canHandleDrop).toHaveBeenCalledWith(
        expect.objectContaining({
          dragDropContext: expect.objectContaining({
            dragging: draggingOperation,
          }),
        })
      );

      // Simulate drop on the pre-populated dimension
      component.find('DragDrop[data-test-subj="lnsGroupB"]').at(0).simulate('drop');
      expect(mockDatasource.onDrop).toHaveBeenCalledWith(
        expect.objectContaining({
          columnId: 'b',
          dragDropContext: expect.objectContaining({
            dragging: draggingOperation,
          }),
        })
      );

      // Simulate drop on the empty dimension
      component.find('DragDrop[data-test-subj="lnsGroupB"]').at(1).simulate('drop');
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

      const draggingOperation = { layerId: 'first', columnId: 'a', groupId: 'a', id: 'a' };

      const component = mountWithIntl(
        <ChildDragDropProvider dragging={draggingOperation} setDragging={jest.fn()}>
          <LayerPanel {...getDefaultProps()} />
        </ChildDragDropProvider>
      );

      expect(mockDatasource.canHandleDrop).not.toHaveBeenCalled();
      component.find('DragDrop[data-test-subj="lnsGroup"]').at(1).prop('onDrop')!(
        (draggingOperation as unknown) as DroppableEvent
      );
      expect(mockDatasource.onDrop).toHaveBeenCalledWith(
        expect.objectContaining({
          isReorder: true,
        })
      );
    });
  });
});
