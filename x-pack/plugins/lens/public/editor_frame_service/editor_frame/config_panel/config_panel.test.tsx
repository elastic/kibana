/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act } from 'react-dom/test-utils';
import {
  createMockFramePublicAPI,
  mockVisualizationMap,
  mockDatasourceMap,
  mockStoreDeps,
  MountStoreProps,
} from '../../../mocks';
import { Visualization } from '../../../types';
import { LayerPanels } from './config_panel';
import { LayerPanel } from './layer_panel';
import { coreMock } from 'src/core/public/mocks';
import { generateId } from '../../../id_generator';
import { mountWithProvider } from '../../../mocks';
import { layerTypes } from '../../../../common';
import { ReactWrapper } from 'enzyme';
import { addLayer } from '../../../state_management';

jest.mock('../../../id_generator');

const waitMs = (time: number) => new Promise((r) => setTimeout(r, time));

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

describe('ConfigPanel', () => {
  const frame = createMockFramePublicAPI();
  function prepareAndMountComponent(
    props: ReturnType<typeof getDefaultProps>,
    customStoreProps?: Partial<MountStoreProps>
  ) {
    (generateId as jest.Mock).mockReturnValue(`newId`);
    return mountWithProvider(
      <LayerPanels {...props} />,
      {
        preloadedState: {
          datasourceStates: {
            testDatasource: {
              isLoading: false,
              state: 'state',
            },
          },
          activeDatasourceId: 'testDatasource',
        },
        storeDeps: mockStoreDeps({
          datasourceMap: props.datasourceMap,
          visualizationMap: props.visualizationMap,
        }),
        ...customStoreProps,
      },
      {
        attachTo: container,
      }
    );
  }
  function getDefaultProps(
    { datasourceMap = mockDatasourceMap(), visualizationMap = mockVisualizationMap() } = {
      datasourceMap: mockDatasourceMap(),
      visualizationMap: mockVisualizationMap(),
    }
  ) {
    frame.datasourceLayers = {
      first: datasourceMap.testDatasource.publicAPIMock,
    };
    return {
      activeVisualizationId: 'testVis',
      visualizationMap,
      activeDatasourceId: 'testDatasource',
      datasourceMap,
      activeVisualization: {
        ...visualizationMap.testVis,
        getLayerIds: () => Object.keys(frame.datasourceLayers),
      } as unknown as Visualization,
      datasourceStates: {
        testDatasource: {
          isLoading: false,
          state: 'state',
        },
      },
      visualizationState: 'state',
      updateVisualization: jest.fn(),
      updateDatasource: jest.fn(),
      updateAll: jest.fn(),
      framePublicAPI: frame,
      dispatch: jest.fn(),
      core: coreMock.createStart(),
      isFullscreen: false,
      toggleFullscreen: jest.fn(),
    };
  }

  // in what case is this test needed?
  it('should fail to render layerPanels if the public API is out of date', async () => {
    const props = getDefaultProps();
    props.framePublicAPI.datasourceLayers = {};
    const { instance } = await prepareAndMountComponent(props);
    expect(instance.find(LayerPanel).exists()).toBe(false);
  });

  it('allow datasources and visualizations to use setters', async () => {
    const props = getDefaultProps();
    const { instance, lensStore } = await prepareAndMountComponent(props);
    const { updateDatasource, updateAll } = instance.find(LayerPanel).props();

    const updater = () => 'updated';
    updateDatasource('testDatasource', updater);
    await waitMs(0);
    expect(lensStore.dispatch).toHaveBeenCalledTimes(1);
    expect(
      (lensStore.dispatch as jest.Mock).mock.calls[0][0].payload.updater(
        props.datasourceStates.testDatasource.state
      )
    ).toEqual('updated');

    updateAll('testDatasource', updater, props.visualizationState);
    // wait for one tick so async updater has a chance to trigger
    await waitMs(0);
    expect(lensStore.dispatch).toHaveBeenCalledTimes(2);
    expect(
      (lensStore.dispatch as jest.Mock).mock.calls[0][0].payload.updater(
        props.datasourceStates.testDatasource.state
      )
    ).toEqual('updated');
  });

  describe('focus behavior when adding or removing layers', () => {
    it('should focus the only layer when resetting the layer', async () => {
      const { instance } = await prepareAndMountComponent(getDefaultProps());
      const firstLayerFocusable = instance
        .find(LayerPanel)
        .first()
        .find('section')
        .first()
        .instance();
      act(() => {
        instance.find('[data-test-subj="lnsLayerRemove"]').first().simulate('click');
      });
      const focusedEl = document.activeElement;
      expect(focusedEl).toEqual(firstLayerFocusable);
    });

    it('should focus the second layer when removing the first layer', async () => {
      const datasourceMap = mockDatasourceMap();
      const defaultProps = getDefaultProps({ datasourceMap });
      // overwriting datasourceLayers to test two layers
      frame.datasourceLayers = {
        first: datasourceMap.testDatasource.publicAPIMock,
        second: datasourceMap.testDatasource.publicAPIMock,
      };

      const { instance } = await prepareAndMountComponent(defaultProps);
      const secondLayerFocusable = instance
        .find(LayerPanel)
        .at(1)
        .find('section')
        .first()
        .instance();
      act(() => {
        instance.find('[data-test-subj="lnsLayerRemove"]').at(0).simulate('click');
      });
      const focusedEl = document.activeElement;
      expect(focusedEl).toEqual(secondLayerFocusable);
    });

    it('should focus the first layer when removing the second layer', async () => {
      const datasourceMap = mockDatasourceMap();
      const defaultProps = getDefaultProps({ datasourceMap });
      // overwriting datasourceLayers to test two layers
      frame.datasourceLayers = {
        first: datasourceMap.testDatasource.publicAPIMock,
        second: datasourceMap.testDatasource.publicAPIMock,
      };
      const { instance } = await prepareAndMountComponent(defaultProps);
      const firstLayerFocusable = instance
        .find(LayerPanel)
        .first()
        .find('section')
        .first()
        .instance();
      act(() => {
        instance.find('[data-test-subj="lnsLayerRemove"]').at(2).simulate('click');
      });
      const focusedEl = document.activeElement;
      expect(focusedEl).toEqual(firstLayerFocusable);
    });

    it('should focus the added layer', async () => {
      const datasourceMap = mockDatasourceMap();
      frame.datasourceLayers = {
        first: datasourceMap.testDatasource.publicAPIMock,
        newId: datasourceMap.testDatasource.publicAPIMock,
      };

      const defaultProps = getDefaultProps({ datasourceMap });

      const { instance } = await prepareAndMountComponent(defaultProps, {
        dispatch: jest.fn((x) => {
          if (x.type === addLayer.type) {
            frame.datasourceLayers.newId = datasourceMap.testDatasource.publicAPIMock;
          }
        }),
      });

      act(() => {
        instance.find('[data-test-subj="lnsLayerAddButton"]').first().simulate('click');
      });
      const focusedEl = document.activeElement;
      expect(focusedEl?.children[0].getAttribute('data-test-subj')).toEqual('lns-layerPanel-1');
    });
  });

  describe('initial default value', () => {
    function clickToAddLayer(instance: ReactWrapper) {
      act(() => {
        instance.find('[data-test-subj="lnsLayerAddButton"]').first().simulate('click');
      });
      instance.update();
      act(() => {
        instance
          .find(`[data-test-subj="lnsLayerAddButton-${layerTypes.REFERENCELINE}"]`)
          .first()
          .simulate('click');
      });
      instance.update();

      return waitMs(0);
    }

    function clickToAddDimension(instance: ReactWrapper) {
      act(() => {
        instance.find('[data-test-subj="lns-empty-dimension"]').last().simulate('click');
      });
      return waitMs(0);
    }

    it('should not add an initial dimension when not specified', async () => {
      const datasourceMap = mockDatasourceMap();
      const visualizationMap = mockVisualizationMap();

      visualizationMap.testVis.getSupportedLayers = jest.fn(() => [
        { type: layerTypes.DATA, label: 'Data Layer' },
        {
          type: layerTypes.REFERENCELINE,
          label: 'Reference layer',
        },
      ]);
      datasourceMap.testDatasource.initializeDimension = jest.fn();
      const props = getDefaultProps({ datasourceMap, visualizationMap });

      const { instance, lensStore } = await prepareAndMountComponent(props);
      await clickToAddLayer(instance);

      expect(lensStore.dispatch).toHaveBeenCalledTimes(1);
      expect(datasourceMap.testDatasource.initializeDimension).not.toHaveBeenCalled();
    });

    it('should not add an initial dimension when initialDimensions are not available for the given layer type', async () => {
      const datasourceMap = mockDatasourceMap();
      const visualizationMap = mockVisualizationMap();
      datasourceMap.testDatasource.initializeDimension = jest.fn();

      visualizationMap.testVis.getSupportedLayers = jest.fn(() => [
        {
          type: layerTypes.DATA,
          label: 'Data Layer',
          initialDimensions: [
            {
              groupId: 'testGroup',
              columnId: 'myColumn',
              dataType: 'number',
              label: 'Initial value',
              staticValue: 100,
            },
          ],
        },
        {
          type: layerTypes.REFERENCELINE,
          label: 'Reference layer',
        },
      ]);
      const props = getDefaultProps({ datasourceMap, visualizationMap });
      const { instance, lensStore } = await prepareAndMountComponent(props);
      await clickToAddLayer(instance);

      expect(lensStore.dispatch).toHaveBeenCalledTimes(1);
      expect(datasourceMap.testDatasource.initializeDimension).not.toHaveBeenCalled();
    });

    it('should use group initial dimension value when adding a new layer if available', async () => {
      const datasourceMap = mockDatasourceMap();
      const visualizationMap = mockVisualizationMap();
      visualizationMap.testVis.getSupportedLayers = jest.fn(() => [
        { type: layerTypes.DATA, label: 'Data Layer' },
        {
          type: layerTypes.REFERENCELINE,
          label: 'Reference layer',
          initialDimensions: [
            {
              groupId: 'testGroup',
              columnId: 'myColumn',
              dataType: 'number',
              label: 'Initial value',
              staticValue: 100,
            },
          ],
        },
      ]);
      datasourceMap.testDatasource.initializeDimension = jest.fn();
      const props = getDefaultProps({ datasourceMap, visualizationMap });

      const { instance, lensStore } = await prepareAndMountComponent(props);
      await clickToAddLayer(instance);

      expect(lensStore.dispatch).toHaveBeenCalledTimes(1);
      expect(datasourceMap.testDatasource.initializeDimension).toHaveBeenCalledWith({}, 'newId', {
        columnId: 'myColumn',
        dataType: 'number',
        groupId: 'testGroup',
        label: 'Initial value',
        staticValue: 100,
      });
    });

    it('should add an initial dimension value when clicking on the empty dimension button', async () => {
      const datasourceMap = mockDatasourceMap();

      const visualizationMap = mockVisualizationMap();
      visualizationMap.testVis.getSupportedLayers = jest.fn(() => [
        {
          type: layerTypes.DATA,
          label: 'Data Layer',
          initialDimensions: [
            {
              groupId: 'a',
              columnId: 'newId',
              dataType: 'number',
              label: 'Initial value',
              staticValue: 100,
            },
          ],
        },
      ]);
      datasourceMap.testDatasource.initializeDimension = jest.fn();
      const props = getDefaultProps({ visualizationMap, datasourceMap });
      const { instance, lensStore } = await prepareAndMountComponent(props);

      await clickToAddDimension(instance);
      expect(lensStore.dispatch).toHaveBeenCalledTimes(1);

      expect(datasourceMap.testDatasource.initializeDimension).toHaveBeenCalledWith(
        'state',
        'first',
        {
          groupId: 'a',
          columnId: 'newId',
          dataType: 'number',
          label: 'Initial value',
          staticValue: 100,
        }
      );
    });
  });
});
