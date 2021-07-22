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
} from '../../../mocks';
import { Visualization } from '../../../types';
import { LayerPanels } from './config_panel';
import { LayerPanel } from './layer_panel';
import { coreMock } from 'src/core/public/mocks';
import { generateId } from '../../../id_generator';
import { mountWithProvider } from '../../../mocks';

jest.mock('../../../id_generator');

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
  let mockVisualization: jest.Mocked<Visualization>;
  let mockVisualization2: jest.Mocked<Visualization>;
  let mockDatasource: DatasourceMock;
  const frame = createMockFramePublicAPI();

  function getDefaultProps() {
    frame.datasourceLayers = {
      first: mockDatasource.publicAPIMock,
    };
    return {
      activeVisualizationId: 'vis1',
      visualizationMap: {
        vis1: mockVisualization,
        vis2: mockVisualization2,
      },
      activeDatasourceId: 'mockindexpattern',
      datasourceMap: {
        mockindexpattern: mockDatasource,
      },
      activeVisualization: ({
        ...mockVisualization,
        getLayerIds: () => Object.keys(frame.datasourceLayers),
        appendLayer: jest.fn(),
      } as unknown) as Visualization,
      datasourceStates: {
        mockindexpattern: {
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

    mockVisualization.getLayerIds.mockReturnValue(Object.keys(frame.datasourceLayers));
    mockDatasource = createMockDatasource('mockindexpattern');
  });

  // in what case is this test needed?
  it('should fail to render layerPanels if the public API is out of date', async () => {
    const props = getDefaultProps();
    props.framePublicAPI.datasourceLayers = {};
    const { instance } = await mountWithProvider(<LayerPanels {...props} />);
    expect(instance.find(LayerPanel).exists()).toBe(false);
  });

  it('allow datasources and visualizations to use setters', async () => {
    const props = getDefaultProps();
    const { instance, lensStore } = await mountWithProvider(<LayerPanels {...props} />, {
      preloadedState: {
        datasourceStates: {
          mockindexpattern: {
            isLoading: false,
            state: 'state',
          },
        },
      },
    });
    const { updateDatasource, updateAll } = instance.find(LayerPanel).props();

    const updater = () => 'updated';
    updateDatasource('mockindexpattern', updater);
    await new Promise((r) => setTimeout(r, 0));
    expect(lensStore.dispatch).toHaveBeenCalledTimes(1);
    expect(
      (lensStore.dispatch as jest.Mock).mock.calls[0][0].payload.updater(
        props.datasourceStates.mockindexpattern.state
      )
    ).toEqual('updated');

    updateAll('mockindexpattern', updater, props.visualizationState);
    // wait for one tick so async updater has a chance to trigger
    await new Promise((r) => setTimeout(r, 0));
    expect(lensStore.dispatch).toHaveBeenCalledTimes(2);
    expect(
      (lensStore.dispatch as jest.Mock).mock.calls[0][0].payload.updater(
        props.datasourceStates.mockindexpattern.state
      )
    ).toEqual('updated');
  });

  describe('focus behavior when adding or removing layers', () => {
    it('should focus the only layer when resetting the layer', async () => {
      const { instance } = await mountWithProvider(
        <LayerPanels {...getDefaultProps()} />,
        {
          preloadedState: {
            datasourceStates: {
              mockindexpattern: {
                isLoading: false,
                state: 'state',
              },
            },
          },
        },
        {
          attachTo: container,
        }
      );
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
      const defaultProps = getDefaultProps();
      // overwriting datasourceLayers to test two layers
      frame.datasourceLayers = {
        first: mockDatasource.publicAPIMock,
        second: mockDatasource.publicAPIMock,
      };
      const { instance } = await mountWithProvider(
        <LayerPanels {...defaultProps} />,
        {
          preloadedState: {
            datasourceStates: {
              mockindexpattern: {
                isLoading: false,
                state: 'state',
              },
            },
          },
        },
        {
          attachTo: container,
        }
      );

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
      const defaultProps = getDefaultProps();
      // overwriting datasourceLayers to test two layers
      frame.datasourceLayers = {
        first: mockDatasource.publicAPIMock,
        second: mockDatasource.publicAPIMock,
      };
      const { instance } = await mountWithProvider(
        <LayerPanels {...defaultProps} />,
        {
          preloadedState: {
            datasourceStates: {
              mockindexpattern: {
                isLoading: false,
                state: 'state',
              },
            },
          },
        },
        {
          attachTo: container,
        }
      );
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
      (generateId as jest.Mock).mockReturnValue(`second`);

      const { instance } = await mountWithProvider(
        <LayerPanels {...getDefaultProps()} />,

        {
          preloadedState: {
            datasourceStates: {
              mockindexpattern: {
                isLoading: false,
                state: 'state',
              },
            },
            activeDatasourceId: 'mockindexpattern',
          },
          dispatch: jest.fn((x) => {
            if (x.payload.subType === 'ADD_LAYER') {
              frame.datasourceLayers.second = mockDatasource.publicAPIMock;
            }
          }),
        },
        {
          attachTo: container,
        }
      );
      act(() => {
        instance.find('[data-test-subj="lnsLayerAddButton"]').first().simulate('click');
      });
      const focusedEl = document.activeElement;
      expect(focusedEl?.children[0].getAttribute('data-test-subj')).toEqual('lns-layerPanel-1');
    });
  });
});
