/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act } from 'react-dom/test-utils';
import type { Query, AggregateQuery } from '@kbn/es-query';

import {
  createMockFramePublicAPI,
  mockVisualizationMap,
  mockDatasourceMap,
  mockStoreDeps,
  MountStoreProps,
} from '../../../mocks';
import type { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import { Visualization } from '../../../types';
import { LayerPanels } from './config_panel';
import { LayerPanel } from './layer_panel';
import { coreMock } from '@kbn/core/public/mocks';
import { UiActionsStart } from '@kbn/ui-actions-plugin/public';
import { uiActionsPluginMock } from '@kbn/ui-actions-plugin/public/mocks';
import { generateId } from '../../../id_generator';
import { mountWithProvider } from '../../../mocks';
import { LayerTypes } from '@kbn/expression-xy-plugin/public';
import { ReactWrapper } from 'enzyme';
import { createIndexPatternServiceMock } from '../../../mocks/data_views_service_mock';
import { AddLayerButton } from '../../../visualizations/xy/add_layer';
import { LayerType } from '@kbn/visualizations-plugin/common';

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

const addNewLayer = (instance: ReactWrapper, type: LayerType = LayerTypes.REFERENCELINE) =>
  act(() => {
    instance.find(`button[data-test-subj="${type}"]`).first().simulate('click');
  });

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

  let uiActions: UiActionsStart;

  beforeEach(() => {
    uiActions = uiActionsPluginMock.createStartContract();
  });

  function prepareAndMountComponent(
    props: ReturnType<typeof getDefaultProps>,
    customStoreProps?: Partial<MountStoreProps>,
    query?: Query | AggregateQuery
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
          query: query as Query,
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
        getAddLayerButtonComponent: (props) => {
          return (
            <>
              <button
                data-test-subj={LayerTypes.REFERENCELINE}
                onClick={() => props.addLayer(LayerTypes.REFERENCELINE)}
              />
              <button
                data-test-subj={LayerTypes.ANNOTATIONS}
                onClick={() => props.addLayer(LayerTypes.ANNOTATIONS)}
              />
            </>
          );
        },
      } as Visualization,
      datasourceStates: {
        testDatasource: {
          isLoading: false,
          state: 'state',
        },
      },
      indexPatternService: createIndexPatternServiceMock(),
      visualizationState: 'state',
      updateVisualization: jest.fn(),
      updateDatasource: jest.fn(),
      updateAll: jest.fn(),
      framePublicAPI: frame,
      dispatch: jest.fn(),
      core: coreMock.createStart(),
      isFullscreen: false,
      toggleFullscreen: jest.fn(),
      uiActions,
      dataViews: {} as DataViewsPublicPluginStart,
      getUserMessages: () => [],
    };
  }

  // in what case is this test needed?
  it('should fail to render layerPanels if the public API is out of date', async () => {
    const props = getDefaultProps();
    props.framePublicAPI.datasourceLayers = {};
    const { instance } = await prepareAndMountComponent(props);
    expect(instance.find(LayerPanel).exists()).toBe(false);
  });

  it('updates datasources and visualizations', async () => {
    const props = getDefaultProps();
    const { instance, lensStore } = await prepareAndMountComponent(props);
    const { updateDatasource, updateAll } = instance.find(LayerPanel).props();

    const newDatasourceState = 'updated';
    updateDatasource('testDatasource', newDatasourceState);
    await waitMs(0);
    expect(lensStore.dispatch).toHaveBeenCalledTimes(1);
    expect((lensStore.dispatch as jest.Mock).mock.calls[0][0].payload.newDatasourceState).toEqual(
      'updated'
    );

    updateAll('testDatasource', newDatasourceState, props.visualizationState);
    // wait for one tick so async updater has a chance to trigger
    await waitMs(0);
    expect(lensStore.dispatch).toHaveBeenCalledTimes(3);
    expect((lensStore.dispatch as jest.Mock).mock.calls[0][0].payload.newDatasourceState).toEqual(
      'updated'
    );
  });

  describe('initial default value', () => {
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
        { type: LayerTypes.DATA, label: 'Data Layer' },
        {
          type: LayerTypes.REFERENCELINE,
          label: 'Reference layer',
        },
      ]);
      datasourceMap.testDatasource.initializeDimension = jest.fn();
      const props = getDefaultProps({ datasourceMap, visualizationMap });

      const { instance, lensStore } = await prepareAndMountComponent(props);
      addNewLayer(instance);

      expect(lensStore.dispatch).toHaveBeenCalledTimes(1);
      expect(datasourceMap.testDatasource.initializeDimension).not.toHaveBeenCalled();
    });

    it('should not add an initial dimension when initialDimensions are not available for the given layer type', async () => {
      const datasourceMap = mockDatasourceMap();
      const visualizationMap = mockVisualizationMap();
      datasourceMap.testDatasource.initializeDimension = jest.fn();

      visualizationMap.testVis.getSupportedLayers = jest.fn(() => [
        {
          type: LayerTypes.DATA,
          label: 'Data Layer',
          initialDimensions: [
            {
              groupId: 'testGroup',
              columnId: 'myColumn',
              staticValue: 100,
            },
          ],
        },
        {
          type: LayerTypes.REFERENCELINE,
          label: 'Reference layer',
        },
      ]);
      const props = getDefaultProps({ datasourceMap, visualizationMap });
      const { instance, lensStore } = await prepareAndMountComponent(props);

      addNewLayer(instance);
      expect(lensStore.dispatch).toHaveBeenCalledTimes(1);
      expect(datasourceMap.testDatasource.initializeDimension).not.toHaveBeenCalled();
    });

    it('should use group initial dimension value when adding a new layer if available', async () => {
      const datasourceMap = mockDatasourceMap();
      const visualizationMap = mockVisualizationMap();
      visualizationMap.testVis.getSupportedLayers = jest.fn(() => [
        { type: LayerTypes.DATA, label: 'Data Layer' },
        {
          type: LayerTypes.REFERENCELINE,
          label: 'Reference layer',
          initialDimensions: [
            {
              groupId: 'testGroup',
              columnId: 'myColumn',
              staticValue: 100,
            },
          ],
        },
      ]);
      datasourceMap.testDatasource.initializeDimension = jest.fn();
      const props = getDefaultProps({ datasourceMap, visualizationMap });

      const { instance, lensStore } = await prepareAndMountComponent(props);
      addNewLayer(instance);

      expect(lensStore.dispatch).toHaveBeenCalledTimes(1);
      expect(datasourceMap.testDatasource.initializeDimension).toHaveBeenCalledWith(
        {},
        'newId',
        frame.dataViews.indexPatterns,
        {
          columnId: 'myColumn',
          groupId: 'testGroup',
          staticValue: 100,
          visualizationGroups: [
            expect.objectContaining({
              accessors: [],
              dataTestSubj: 'mockVisA',
              groupId: 'a',
              groupLabel: 'a',
              layerId: 'layer1',
              supportsMoreColumns: true,
            }),
          ],
        }
      );
    });

    it('should add an initial dimension value when clicking on the empty dimension button', async () => {
      const datasourceMap = mockDatasourceMap();

      const visualizationMap = mockVisualizationMap();
      visualizationMap.testVis.getSupportedLayers = jest.fn(() => [
        {
          type: LayerTypes.DATA,
          label: 'Data Layer',
          initialDimensions: [
            {
              groupId: 'a',
              columnId: 'newId',
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
        frame.dataViews.indexPatterns,
        {
          groupId: 'a',
          columnId: 'newId',
          staticValue: 100,
          visualizationGroups: [
            expect.objectContaining({
              accessors: [],
              dataTestSubj: 'mockVisA',
              groupId: 'a',
              groupLabel: 'a',
              layerId: 'layer1',
              supportsMoreColumns: true,
            }),
          ],
        }
      );
    });

    it('When visualization is `noDatasource` should not run datasource methods', async () => {
      const datasourceMap = mockDatasourceMap();

      const visualizationMap = mockVisualizationMap();
      visualizationMap.testVis.setDimension = jest.fn();
      visualizationMap.testVis.getSupportedLayers = jest.fn(() => [
        {
          type: LayerTypes.DATA,
          label: 'Data Layer',
          initialDimensions: [
            {
              groupId: 'testGroup',
              columnId: 'myColumn',
              staticValue: 100,
            },
          ],
        },
        {
          type: LayerTypes.REFERENCELINE,
          label: 'Reference layer',
        },
        {
          type: LayerTypes.ANNOTATIONS,
          label: 'Annotations Layer',
          noDatasource: true,
          initialDimensions: [
            {
              groupId: 'a',
              columnId: 'newId',
              staticValue: 100,
            },
          ],
        },
      ]);

      datasourceMap.testDatasource.initializeDimension = jest.fn();
      const props = getDefaultProps({ visualizationMap, datasourceMap });
      const { instance, lensStore } = await prepareAndMountComponent(props);

      addNewLayer(instance, LayerTypes.ANNOTATIONS);

      expect(lensStore.dispatch).toHaveBeenCalledTimes(1);

      expect(visualizationMap.testVis.setDimension).toHaveBeenCalledWith({
        columnId: 'newId',
        frame: {
          dataViews: expect.anything(),
          activeData: undefined,
          datasourceLayers: {
            a: expect.anything(),
          },
          dateRange: expect.anything(),
          absDateRange: expect.anything(),
          filters: [],
          now: expect.anything(),
          query: undefined,
        },
        groupId: 'a',
        layerId: 'newId',
        prevState: undefined,
      });
      expect(datasourceMap.testDatasource.initializeDimension).not.toHaveBeenCalled();
    });
  });

  describe('text based languages', () => {
    it('should not allow to add a new layer', async () => {
      const datasourceMap = mockDatasourceMap();
      const visualizationMap = mockVisualizationMap();

      visualizationMap.testVis.getSupportedLayers = jest.fn(() => [
        { type: LayerTypes.DATA, label: 'Data Layer' },
        {
          type: LayerTypes.REFERENCELINE,
          label: 'Reference layer',
        },
      ]);
      datasourceMap.testDatasource.initializeDimension = jest.fn();
      const props = getDefaultProps({ datasourceMap, visualizationMap });

      const { instance } = await prepareAndMountComponent(props, {}, { esql: 'from "foo"' });
      expect(instance.find(AddLayerButton).exists()).toBe(false);
    });
  });
});
