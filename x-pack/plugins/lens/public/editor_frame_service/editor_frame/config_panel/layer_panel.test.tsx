/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act } from 'react-dom/test-utils';
import { EuiFormRow } from '@elastic/eui';
import { FramePublicAPI, Visualization, VisualizationConfigProps } from '../../../types';
import { LayerPanel } from './layer_panel';
import { ChildDragDropProvider, DragDrop } from '../../../drag_drop';
import { coreMock } from '@kbn/core/public/mocks';
import { generateId } from '../../../id_generator';
import {
  createMockVisualization,
  createMockFramePublicAPI,
  createMockDatasource,
  DatasourceMock,
  mountWithProvider,
} from '../../../mocks';
import { createIndexPatternServiceMock } from '../../../mocks/data_views_service_mock';

jest.mock('../../../id_generator');

jest.mock('@kbn/kibana-utils-plugin/public', () => {
  const original = jest.requireActual('@kbn/kibana-utils-plugin/public');
  return {
    ...original,
    Storage: class Storage {
      get = () => ({ skipDeleteModal: true });
    },
  };
});

let container: HTMLDivElement | undefined;

beforeEach(() => {
  container = document.createElement('div');
  container.id = 'lensContainer';
  document.body.appendChild(container);
});

afterEach(() => {
  if (container && container.parentNode) {
    container.parentNode.removeChild(container);
  }

  container = undefined;
});

const defaultContext = {
  dragging: undefined,
  setDragging: jest.fn(),
  setActiveDropTarget: () => {},
  activeDropTarget: undefined,
  dropTargetsByOrder: undefined,
  keyboardMode: false,
  setKeyboardMode: () => {},
  setA11yMessage: jest.fn(),
  registerDropTarget: jest.fn(),
};

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

describe('LayerPanel', () => {
  let mockVisualization: jest.Mocked<Visualization>;
  let mockVisualization2: jest.Mocked<Visualization>;

  let mockDatasource: DatasourceMock;
  mockDatasource = createMockDatasource('testDatasource');
  let frame: FramePublicAPI;

  function getDefaultProps() {
    frame = createMockFramePublicAPI();
    frame.datasourceLayers = {
      first: mockDatasource.publicAPIMock,
    };
    return {
      layerId: 'first',
      activeVisualization: mockVisualization,
      dimensionGroups: mockVisualization.getConfiguration({} as VisualizationConfigProps).groups,
      datasourceMap: {
        testDatasource: mockDatasource,
      },
      visualizationState: 'state',
      updateVisualization: jest.fn(),
      updateDatasource: jest.fn(),
      updateDatasourceAsync: jest.fn(),
      updateAll: jest.fn(),
      framePublicAPI: frame,
      isOnlyLayer: true,
      addLayer: jest.fn(),
      onRemoveLayer: jest.fn(),
      onCloneLayer: jest.fn(),
      onRemoveDimension: jest.fn(),
      dispatch: jest.fn(),
      core: coreMock.createStart(),
      layerIndex: 0,
      registerNewLayerRef: jest.fn(),
      isFullscreen: false,
      toggleFullscreen: jest.fn(),
      onEmptyDimensionAdd: jest.fn(),
      onChangeIndexPattern: jest.fn(),
      indexPatternService: createIndexPatternServiceMock(),
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
          groupLabel: 'testVisGroup',
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
          groupLabel: 'testVis2Group',
        },
      ],
    };

    mockVisualization.getLayerIds.mockReturnValue(['first']);
    mockDatasource = createMockDatasource('testDatasource');
  });

  describe('layer reset and remove', () => {
    it('should show the reset button when single layer', async () => {
      const { instance } = await mountWithProvider(<LayerPanel {...getDefaultProps()} />);
      expect(
        instance.find('[data-test-subj="lnsLayerRemove--0"]').first().props()['aria-label']
      ).toContain('Clear layer');
    });

    it('should show the delete button when multiple layers', async () => {
      const { instance } = await mountWithProvider(
        <LayerPanel {...getDefaultProps()} isOnlyLayer={false} />
      );
      expect(
        instance.find('[data-test-subj="lnsLayerRemove--0"]').first().props()['aria-label']
      ).toContain('Delete layer');
    });

    it('should call the clear callback', async () => {
      const cb = jest.fn();
      const { instance } = await mountWithProvider(
        <LayerPanel {...getDefaultProps()} onRemoveLayer={cb} />
      );
      act(() => {
        instance.find('[data-test-subj="lnsLayerRemove--0"]').first().simulate('click');
      });
      instance.update();
      expect(cb).toHaveBeenCalled();
    });
  });

  describe('single group', () => {
    it('should render the non-editable state and optional label', async () => {
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

      const { instance } = await mountWithProvider(<LayerPanel {...getDefaultProps()} />);

      const group = instance.find('.lnsLayerPanel__dimensionContainer[data-test-subj="lnsGroup"]');
      expect(group).toHaveLength(1);
      const optionalLabel = instance.find('[data-test-subj="lnsGroup_optional"]').first();
      expect(optionalLabel.text()).toEqual('Optional');
    });

    it('should render the group with a way to add a new column', async () => {
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

      const { instance } = await mountWithProvider(<LayerPanel {...getDefaultProps()} />);
      const group = instance.find('.lnsLayerPanel__dimensionContainer[data-test-subj="lnsGroup"]');
      expect(group).toHaveLength(1);
    });

    it('should render the required warning when only one group is configured', async () => {
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
            requiredMinDimensionCount: 1,
          },
        ],
      });

      const { instance } = await mountWithProvider(<LayerPanel {...getDefaultProps()} />);

      const group = instance
        .find(EuiFormRow)
        .findWhere((e) => e.prop('error') === 'Requires field');

      expect(group).toHaveLength(1);
    });

    it('should tell the user to remove the correct number of dimensions', async () => {
      mockVisualization.getConfiguration.mockReturnValue({
        groups: [
          {
            groupLabel: 'A',
            groupId: 'a',
            accessors: [{ columnId: 'x' }],
            filterOperations: () => true,
            supportsMoreColumns: false,
            dataTestSubj: 'lnsGroup',
            dimensionsTooMany: 1,
          },
          {
            groupLabel: 'A',
            groupId: 'a',
            accessors: [{ columnId: 'x' }],
            filterOperations: () => true,
            supportsMoreColumns: false,
            dataTestSubj: 'lnsGroup',
            dimensionsTooMany: -1,
          },
          {
            groupLabel: 'B',
            groupId: 'b',
            accessors: [],
            filterOperations: () => true,
            supportsMoreColumns: true,
            dataTestSubj: 'lnsGroup',
            dimensionsTooMany: 3,
          },
        ],
      });

      const { instance } = await mountWithProvider(<LayerPanel {...getDefaultProps()} />);

      const groups = instance.find(EuiFormRow);

      expect(groups.findWhere((e) => e.prop('error') === 'Please remove a dimension')).toHaveLength(
        1
      );
      expect(
        groups.findWhere((e) => e.prop('error') === 'Please remove 3 dimensions')
      ).toHaveLength(1);
      expect(groups.findWhere((e) => e.prop('error') === '')).toHaveLength(1);
    });

    it.each`
      minDimensions | accessors | errors
      ${1}          | ${0}      | ${1}
      ${2}          | ${0}      | ${2}
      ${2}          | ${1}      | ${2}
    `(
      'should render the required warning for $errors fields when only one group is configured with requiredMinDimensionCount: $minDimensions and $accessors accessors',
      async ({ minDimensions, accessors, errors }) => {
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
              accessors: [{ columnId: 'y' }].slice(0, accessors),
              filterOperations: () => true,
              supportsMoreColumns: true,
              dataTestSubj: 'lnsGroup',
              requiredMinDimensionCount: minDimensions,
            },
          ],
        });
        const { instance } = await mountWithProvider(<LayerPanel {...getDefaultProps()} />);

        const errorMessage = errors === 1 ? 'Requires field' : 'Requires 2 fields';

        const group = instance.find(EuiFormRow).findWhere((e) => e.prop('error') === errorMessage);

        expect(group).toHaveLength(1);
      }
    );

    it.each`
      minDimensions | accessors
      ${0}          | ${0}
      ${0}          | ${1}
      ${1}          | ${1}
      ${1}          | ${2}
      ${2}          | ${2}
    `(
      'should not render the required warning when only one group is configured with requiredMinDimensionCount: $minDimensions and $accessors accessors',
      async ({ minDimensions, accessors }) => {
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
              accessors: [{ columnId: 'y' }, { columnId: 'z' }].slice(0, accessors),
              filterOperations: () => true,
              supportsMoreColumns: true,
              dataTestSubj: 'lnsGroup',
              requiredMinDimensionCount: minDimensions,
            },
          ],
        });
        const { instance } = await mountWithProvider(<LayerPanel {...getDefaultProps()} />);

        const group = instance.find(EuiFormRow).findWhere((e) => e.prop('error'));

        expect(group).toHaveLength(0);
      }
    );

    it('should render the datasource and visualization panels inside the dimension container', async () => {
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

      const { instance } = await mountWithProvider(<LayerPanel {...getDefaultProps()} />);
      act(() => {
        instance.find('[data-test-subj="lns-empty-dimension"]').first().simulate('click');
      });
      instance.update();

      const group = instance.find('DimensionContainer').first();
      const panel: React.ReactElement = group.prop('panel');
      expect(panel.props.children).toHaveLength(2);
    });

    it('should not update the visualization if the datasource is incomplete', async () => {
      (generateId as jest.Mock).mockReturnValue(`newid`);
      const updateAll = jest.fn();
      const updateDatasourceAsync = jest.fn();

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

      const { instance } = await mountWithProvider(
        <LayerPanel
          {...getDefaultProps()}
          updateDatasourceAsync={updateDatasourceAsync}
          updateAll={updateAll}
        />
      );

      act(() => {
        instance.find('[data-test-subj="lns-empty-dimension"]').first().simulate('click');
      });
      instance.update();

      expect(mockDatasource.renderDimensionEditor).toHaveBeenCalledWith(
        expect.any(Element),
        expect.objectContaining({ columnId: 'newid' })
      );
      const stateFn =
        mockDatasource.renderDimensionEditor.mock.calls[
          mockDatasource.renderDimensionEditor.mock.calls.length - 1
        ][1].setState;

      act(() => {
        stateFn(
          {
            indexPatternId: '1',
            columns: {},
            columnOrder: [],
            incompleteColumns: { newId: { operationType: 'count' } },
          },
          { isDimensionComplete: false }
        );
      });
      expect(updateAll).not.toHaveBeenCalled();
      expect(updateDatasourceAsync).toHaveBeenCalled();

      act(() => {
        stateFn({
          indexPatternId: '1',
          columns: {},
          columnOrder: [],
        });
      });
      expect(updateAll).toHaveBeenCalled();
    });

    it('should remove the dimension when the datasource marks it as removed', async () => {
      mockVisualization.getConfiguration.mockReturnValue({
        groups: [
          {
            groupLabel: 'A',
            groupId: 'a',
            accessors: [{ columnId: 'y' }],
            filterOperations: () => true,
            supportsMoreColumns: true,
            dataTestSubj: 'lnsGroup',
          },
        ],
      });

      const props = getDefaultProps();
      const { instance } = await mountWithProvider(<LayerPanel {...props} />, {
        preloadedState: {
          datasourceStates: {
            testDatasource: {
              isLoading: false,
              state: {
                layers: [
                  {
                    indexPatternId: '1',
                    columns: {
                      y: {
                        operationType: 'moving_average',
                        references: ['ref'],
                      },
                    },
                    columnOrder: ['y'],
                    incompleteColumns: {},
                  },
                ],
              },
            },
          },
        },
      });

      act(() => {
        instance.find('[data-test-subj="lnsLayerPanel-dimensionLink"]').last().simulate('click');
      });
      instance.update();

      expect(mockDatasource.renderDimensionEditor).toHaveBeenCalledWith(
        expect.any(Element),
        expect.objectContaining({ columnId: 'y' })
      );
      const stateFn =
        mockDatasource.renderDimensionEditor.mock.calls[
          mockDatasource.renderDimensionEditor.mock.calls.length - 1
        ][1].setState;

      act(() => {
        stateFn(
          {
            indexPatternId: '1',
            columns: {},
            columnOrder: [],
            incompleteColumns: { y: { operationType: 'average' } },
          },
          {
            isDimensionComplete: false,
          }
        );
      });
      expect(props.onRemoveDimension).toHaveBeenCalledWith({
        layerId: props.layerId,
        columnId: 'y',
      });
    });

    it('should keep the DimensionContainer open when configuring a new dimension', async () => {
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
            enableDimensionEditor: true,
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
            enableDimensionEditor: true,
            dataTestSubj: 'lnsGroup',
          },
        ],
      });

      const { instance } = await mountWithProvider(<LayerPanel {...getDefaultProps()} />);
      act(() => {
        instance.find('[data-test-subj="lns-empty-dimension"]').first().simulate('click');
      });
      instance.update();

      expect(instance.find('EuiFlyoutHeader').exists()).toBe(true);

      const lastArgs =
        mockDatasource.renderDimensionEditor.mock.calls[
          mockDatasource.renderDimensionEditor.mock.calls.length - 1
        ][1];

      // Simulate what is called by the dimension editor
      act(() => {
        lastArgs.setState(lastArgs.state, {
          isDimensionComplete: true,
        });
      });

      expect(mockVisualization.renderDimensionEditor).toHaveBeenCalled();
    });

    it('should close the DimensionContainer when the active visualization changes', async () => {
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

      const { instance } = await mountWithProvider(<LayerPanel {...getDefaultProps()} />);

      act(() => {
        instance.find('[data-test-subj="lns-empty-dimension"]').first().simulate('click');
      });
      instance.update();
      expect(instance.find('EuiFlyoutHeader').exists()).toBe(true);
      act(() => {
        instance.setProps({ activeVisualization: mockVisualization2 });
      });
      instance.update();
      expect(instance.find('EuiFlyoutHeader').exists()).toBe(false);
    });

    it('should only update the state on close when needed', async () => {
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

      const { instance } = await mountWithProvider(
        <LayerPanel {...getDefaultProps()} updateDatasource={updateDatasource} />
      );

      // Close without a state update
      mockDatasource.updateStateOnCloseDimension = jest.fn();
      instance.find('[data-test-subj="lnsLayerPanel-dimensionLink"]').last().simulate('click');
      act(() => {
        (instance.find('DimensionContainer').last().prop('handleClose') as () => void)();
      });
      instance.update();
      expect(mockDatasource.updateStateOnCloseDimension).toHaveBeenCalled();
      expect(updateDatasource).not.toHaveBeenCalled();

      // Close with a state update
      mockDatasource.updateStateOnCloseDimension = jest.fn().mockReturnValue({ newState: true });

      instance.find('[data-test-subj="lnsLayerPanel-dimensionLink"]').last().simulate('click');
      act(() => {
        (instance.find('DimensionContainer').last().prop('handleClose') as () => void)();
      });
      instance.update();
      expect(mockDatasource.updateStateOnCloseDimension).toHaveBeenCalled();
      expect(updateDatasource).toHaveBeenCalledWith('testDatasource', { newState: true });
    });

    it('should display the fake final accessor if present in the group config', async () => {
      const fakeAccessorLabel = "I'm a fake!";
      mockVisualization.getConfiguration.mockReturnValue({
        groups: [
          {
            groupLabel: 'A',
            groupId: 'a',
            accessors: [{ columnId: 'a' }],
            filterOperations: () => true,
            fakeFinalAccessor: {
              label: fakeAccessorLabel,
            },
            supportsMoreColumns: false,
            dataTestSubj: 'lnsGroup',
          },
        ],
      });

      const { instance } = await mountWithProvider(<LayerPanel {...getDefaultProps()} />);

      expect(instance.exists('[data-test-subj="lns-fakeDimension"]')).toBeTruthy();
      expect(
        instance
          .find('[data-test-subj="lns-fakeDimension"] .lnsLayerPanel__triggerTextLabel')
          .text()
      ).toBe(fakeAccessorLabel);
    });

    it('should not display the fake final accessor if not present in the group config', async () => {
      mockVisualization.getConfiguration.mockReturnValue({
        groups: [
          {
            groupLabel: 'A',
            groupId: 'a',
            accessors: [{ columnId: 'a' }],
            filterOperations: () => true,
            fakeFinalAccessor: undefined,
            supportsMoreColumns: false,
            dataTestSubj: 'lnsGroup',
          },
        ],
      });

      const { instance } = await mountWithProvider(<LayerPanel {...getDefaultProps()} />);

      expect(instance.exists('[data-test-subj="lns-fakeDimension"]')).toBeFalsy();
    });
  });

  // This test is more like an integration test, since the layer panel owns all
  // the coordination between drag and drop
  describe('drag and drop behavior', () => {
    it('should determine if the datasource supports dropping of a field onto empty dimension', async () => {
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
        dropTypes: ['field_add'],
        nextLabel: '',
      });

      const { instance } = await mountWithProvider(
        <ChildDragDropProvider {...defaultContext} dragging={draggingField}>
          <LayerPanel {...getDefaultProps()} />
        </ChildDragDropProvider>
      );

      expect(mockDatasource.getDropProps).toHaveBeenCalledWith(
        expect.objectContaining({
          source: draggingField,
        })
      );

      const dragDropElement = instance
        .find('[data-test-subj="lnsGroup"] DragDrop .lnsDragDrop')
        .first();

      dragDropElement.simulate('dragOver');
      dragDropElement.simulate('drop');

      expect(mockDatasource.onDrop).toHaveBeenCalledWith(
        expect.objectContaining({
          source: draggingField,
        })
      );
    });

    it('should determine if the datasource supports dropping of a field onto a pre-filled dimension', async () => {
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

      mockDatasource.getDropProps.mockImplementation(({ target }) =>
        target.columnId !== 'a' ? { dropTypes: ['field_replace'], nextLabel: '' } : undefined
      );

      const { instance } = await mountWithProvider(
        <ChildDragDropProvider {...defaultContext} dragging={draggingField}>
          <LayerPanel {...getDefaultProps()} />
        </ChildDragDropProvider>
      );

      expect(mockDatasource.getDropProps).toHaveBeenCalledWith(
        expect.objectContaining({
          target: expect.objectContaining({ columnId: 'a', groupId: 'a', layerId: 'first' }),
        })
      );

      expect(
        instance.find('[data-test-subj="lnsGroup"] DragDrop').first().prop('dropType')
      ).toEqual(undefined);

      const dragDropElement = instance
        .find('[data-test-subj="lnsGroup"] DragDrop')
        .first()
        .find('.lnsLayerPanel__dimension');

      dragDropElement.simulate('dragOver');
      dragDropElement.simulate('drop');

      expect(mockDatasource.onDrop).not.toHaveBeenCalled();
    });

    it('should allow drag to move between groups', async () => {
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
        dropTypes: ['replace_compatible'],
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

      const { instance } = await mountWithProvider(
        <ChildDragDropProvider {...defaultContext} dragging={draggingOperation}>
          <LayerPanel {...getDefaultProps()} />
        </ChildDragDropProvider>
      );

      expect(mockDatasource.getDropProps).toHaveBeenCalledWith(
        expect.objectContaining({
          source: draggingOperation,
        })
      );

      // Simulate drop on the pre-populated dimension

      const dragDropElement = instance
        .find('[data-test-subj="lnsGroupB"] DragDrop .lnsDragDrop')
        .at(0);
      dragDropElement.simulate('dragOver');
      dragDropElement.simulate('drop');

      expect(mockDatasource.onDrop).toHaveBeenCalledWith(
        expect.objectContaining({
          target: expect.objectContaining({ columnId: 'b' }),
          source: draggingOperation,
        })
      );

      // Simulate drop on the empty dimension

      const updatedDragDropElement = instance
        .find('[data-test-subj="lnsGroupB"] DragDrop .lnsDragDrop')
        .at(2);

      updatedDragDropElement.simulate('dragOver');
      updatedDragDropElement.simulate('drop');

      expect(mockDatasource.onDrop).toHaveBeenCalledWith(
        expect.objectContaining({
          target: expect.objectContaining({ columnId: 'newid' }),
          source: draggingOperation,
        })
      );
    });

    it('should reorder when dropping in the same group', async () => {
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

      const { instance } = await mountWithProvider(
        <ChildDragDropProvider {...defaultContext} dragging={draggingOperation}>
          <LayerPanel {...getDefaultProps()} />
        </ChildDragDropProvider>,
        undefined,
        { attachTo: container }
      );
      act(() => {
        instance.find(DragDrop).at(1).prop('onDrop')!(draggingOperation, 'reorder');
      });
      expect(mockDatasource.onDrop).toHaveBeenCalledWith(
        expect.objectContaining({
          dropType: 'reorder',
          source: draggingOperation,
        })
      );
      const secondButton = instance
        .find(DragDrop)
        .at(1)
        .find('[data-test-subj="lnsDragDrop-keyboardHandler"]')
        .at(1)
        .instance();
      const focusedEl = document.activeElement;
      expect(focusedEl).toEqual(secondButton);
    });

    it('should copy when dropping on empty slot in the same group', async () => {
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

      const { instance } = await mountWithProvider(
        <ChildDragDropProvider {...defaultContext} dragging={draggingOperation}>
          <LayerPanel {...getDefaultProps()} />
        </ChildDragDropProvider>
      );
      act(() => {
        instance.find(DragDrop).at(2).prop('onDrop')!(draggingOperation, 'duplicate_compatible');
      });
      expect(mockDatasource.onDrop).toHaveBeenCalledWith(
        expect.objectContaining({
          target: expect.objectContaining({ columnId: 'newid' }),
          dropType: 'duplicate_compatible',
          source: draggingOperation,
        })
      );
    });

    it('should call onDrop and update visualization when replacing between compatible groups', async () => {
      const mockVis = {
        ...mockVisualization,
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

      mockDatasource.onDrop.mockReturnValue(true);
      const updateVisualization = jest.fn();
      const mockOnRemoveDimension = jest.fn();

      const { instance } = await mountWithProvider(
        <ChildDragDropProvider {...defaultContext} dragging={draggingOperation}>
          <LayerPanel
            {...getDefaultProps()}
            onRemoveDimension={mockOnRemoveDimension}
            updateVisualization={updateVisualization}
            activeVisualization={mockVis}
          />
        </ChildDragDropProvider>
      );
      act(() => {
        instance.find(DragDrop).at(3).prop('onDrop')!(draggingOperation, 'replace_compatible');
      });
      expect(mockDatasource.onDrop).toHaveBeenCalledWith(
        expect.objectContaining({
          dropType: 'replace_compatible',
          source: draggingOperation,
        })
      );
      // testing default onDropForVisualization path
      expect(mockVis.setDimension).toHaveBeenCalledWith(
        expect.objectContaining({
          columnId: 'c',
          groupId: 'b',
          layerId: 'first',
          prevState: 'state',
        })
      );
      expect(mockOnRemoveDimension).toHaveBeenCalledWith({
        columnId: 'a',
        layerId: 'first',
      });
      expect(updateVisualization).toHaveBeenCalledTimes(1);
    });
    it('should call onDrop and update visualization when replacing between compatible groups2', async () => {
      const mockVis = {
        ...mockVisualization,
        setDimension: jest.fn(() => 'modifiedState'),
        onDrop: jest.fn(() => 'modifiedState'),
      };
      jest.spyOn(mockVis.onDrop, 'bind').mockImplementation((thisVal, ...args) => mockVis.onDrop);

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

      mockDatasource.onDrop.mockReturnValue(true);
      const updateVisualization = jest.fn();
      const mockOnRemoveDimension = jest.fn();

      const { instance } = await mountWithProvider(
        <ChildDragDropProvider {...defaultContext} dragging={draggingOperation}>
          <LayerPanel
            {...getDefaultProps()}
            onRemoveDimension={mockOnRemoveDimension}
            updateVisualization={updateVisualization}
            activeVisualization={mockVis}
          />
        </ChildDragDropProvider>
      );
      act(() => {
        instance.find(DragDrop).at(3).prop('onDrop')!(draggingOperation, 'replace_compatible');
      });

      expect(mockDatasource.onDrop).toHaveBeenCalledWith(
        expect.objectContaining({
          dropType: 'replace_compatible',
          source: draggingOperation,
        })
      );

      expect(mockVis.onDrop).toHaveBeenCalledWith(
        expect.objectContaining({
          dropType: 'replace_compatible',
          prevState: 'state',
          source: draggingOperation,
          target: expect.objectContaining({
            columnId: 'c',
            groupId: 'b',
            id: 'c',
            layerId: 'first',
          }),
        }),
        mockVis
      );
      expect(mockVis.setDimension).not.toHaveBeenCalled();
      expect(mockOnRemoveDimension).toHaveBeenCalledWith({
        columnId: 'a',
        layerId: 'first',
      });
      expect(updateVisualization).toHaveBeenCalledTimes(1);
    });

    it('should not change visualization state if datasource drop failed', async () => {
      const mockVis = {
        ...mockVisualization,
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

      mockDatasource.onDrop.mockReturnValue(false);
      const updateVisualization = jest.fn();
      const mockOnRemoveDimension = jest.fn();

      const { instance } = await mountWithProvider(
        <ChildDragDropProvider {...defaultContext} dragging={draggingOperation}>
          <LayerPanel
            {...getDefaultProps()}
            onRemoveDimension={mockOnRemoveDimension}
            updateVisualization={updateVisualization}
            activeVisualization={mockVis}
          />
        </ChildDragDropProvider>
      );
      act(() => {
        instance.find(DragDrop).at(3).prop('onDrop')!(draggingOperation, 'replace_compatible');
      });

      expect(mockDatasource.onDrop).toHaveBeenCalledWith(
        expect.objectContaining({
          dropType: 'replace_compatible',
          source: draggingOperation,
        })
      );
      expect(updateVisualization).not.toHaveBeenCalled();
      expect(mockOnRemoveDimension).not.toHaveBeenCalled();
    });

    it("should not remove source if drop type doesn't require it", async () => {
      const mockVis = {
        ...mockVisualization,
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

      mockDatasource.onDrop.mockReturnValue(true);

      const mockOnRemoveDimension = jest.fn();

      const { instance } = await mountWithProvider(
        <ChildDragDropProvider {...defaultContext} dragging={draggingOperation}>
          <LayerPanel
            {...getDefaultProps()}
            onRemoveDimension={mockOnRemoveDimension}
            activeVisualization={mockVis}
          />
        </ChildDragDropProvider>
      );
      act(() => {
        instance.find(DragDrop).at(3).prop('onDrop')!(draggingOperation, 'duplicate_compatible');
      });

      expect(mockOnRemoveDimension).not.toHaveBeenCalled();
    });
  });

  describe('add a new dimension', () => {
    it('should call onEmptyDimensionAdd callback on new dimension creation', async () => {
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
      const props = getDefaultProps();
      const { instance } = await mountWithProvider(<LayerPanel {...props} />);

      act(() => {
        instance.find('[data-test-subj="lns-empty-dimension"]').first().simulate('click');
      });
      instance.update();

      expect(props.onEmptyDimensionAdd).toHaveBeenCalledWith(
        'newid',
        expect.objectContaining({ groupId: 'a' })
      );
    });
  });
  describe('dimension trigger', () => {
    it('should render datasource dimension trigger if there is layer datasource', async () => {
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
      await mountWithProvider(<LayerPanel {...getDefaultProps()} />);
      expect(mockDatasource.renderDimensionTrigger).toHaveBeenCalled();
    });

    it('should render visualization dimension trigger if there is no layer datasource', async () => {
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

      const props = getDefaultProps();
      const propsWithVisOnlyLayer = {
        ...props,
        framePublicAPI: { ...props.framePublicAPI, datasourceLayers: {} },
      };

      mockVisualization.renderDimensionTrigger = jest.fn();
      mockVisualization.getUniqueLabels = jest.fn(() => ({
        x: 'A',
      }));

      await mountWithProvider(<LayerPanel {...propsWithVisOnlyLayer} />);
      expect(mockDatasource.renderDimensionTrigger).not.toHaveBeenCalled();
      expect(mockVisualization.renderDimensionTrigger).toHaveBeenCalled();
    });
  });
});
