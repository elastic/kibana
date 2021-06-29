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
import { Visualization } from '../../../types';
import { mountWithIntl } from '@kbn/test/jest';
import { LayerPanels } from './config_panel';
import { LayerPanel } from './layer_panel';
import { coreMock } from 'src/core/public/mocks';
import { generateId } from '../../../id_generator';

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
      activeDatasourceId: 'ds1',
      datasourceMap: {
        ds1: mockDatasource,
      },
      activeVisualization: ({
        ...mockVisualization,
        getLayerIds: () => Object.keys(frame.datasourceLayers),
        appendLayer: true,
      } as unknown) as Visualization,
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
    mockDatasource = createMockDatasource('ds1');
  });

  // in what case is this test needed?
  it('should fail to render layerPanels if the public API is out of date', () => {
    const props = getDefaultProps();
    props.framePublicAPI.datasourceLayers = {};
    const component = mountWithIntl(<LayerPanels {...props} />);
    expect(component.find(LayerPanel).exists()).toBe(false);
  });

  it('allow datasources and visualizations to use setters', async () => {
    const props = getDefaultProps();
    const component = mountWithIntl(<LayerPanels {...props} />);
    const { updateDatasource, updateAll } = component.find(LayerPanel).props();

    const updater = () => 'updated';
    updateDatasource('ds1', updater);
    // wait for one tick so async updater has a chance to trigger
    await new Promise((r) => setTimeout(r, 0));
    expect(props.dispatch).toHaveBeenCalledTimes(1);
    expect(props.dispatch.mock.calls[0][0].updater(props.datasourceStates.ds1.state)).toEqual(
      'updated'
    );

    updateAll('ds1', updater, props.visualizationState);
    // wait for one tick so async updater has a chance to trigger
    await new Promise((r) => setTimeout(r, 0));
    expect(props.dispatch).toHaveBeenCalledTimes(2);
    expect(props.dispatch.mock.calls[0][0].updater(props.datasourceStates.ds1.state)).toEqual(
      'updated'
    );
  });

  describe('focus behavior when adding or removing layers', () => {
    it('should focus the only layer when resetting the layer', () => {
      const component = mountWithIntl(<LayerPanels {...getDefaultProps()} />, {
        attachTo: container,
      });
      const firstLayerFocusable = component
        .find(LayerPanel)
        .first()
        .find('section')
        .first()
        .instance();
      act(() => {
        component.find('[data-test-subj="lnsLayerRemove"]').first().simulate('click');
      });
      const focusedEl = document.activeElement;
      expect(focusedEl).toEqual(firstLayerFocusable);
    });

    it('should focus the second layer when removing the first layer', () => {
      const defaultProps = getDefaultProps();
      // overwriting datasourceLayers to test two layers
      frame.datasourceLayers = {
        first: mockDatasource.publicAPIMock,
        second: mockDatasource.publicAPIMock,
      };
      const component = mountWithIntl(<LayerPanels {...defaultProps} />, { attachTo: container });
      const secondLayerFocusable = component
        .find(LayerPanel)
        .at(1)
        .find('section')
        .first()
        .instance();
      act(() => {
        component.find('[data-test-subj="lnsLayerRemove"]').at(0).simulate('click');
      });
      const focusedEl = document.activeElement;
      expect(focusedEl).toEqual(secondLayerFocusable);
    });

    it('should focus the first layer when removing the second layer', () => {
      const defaultProps = getDefaultProps();
      // overwriting datasourceLayers to test two layers
      frame.datasourceLayers = {
        first: mockDatasource.publicAPIMock,
        second: mockDatasource.publicAPIMock,
      };
      const component = mountWithIntl(<LayerPanels {...defaultProps} />, { attachTo: container });
      const firstLayerFocusable = component
        .find(LayerPanel)
        .first()
        .find('section')
        .first()
        .instance();
      act(() => {
        component.find('[data-test-subj="lnsLayerRemove"]').at(2).simulate('click');
      });
      const focusedEl = document.activeElement;
      expect(focusedEl).toEqual(firstLayerFocusable);
    });

    it('should focus the added layer', () => {
      (generateId as jest.Mock).mockReturnValue(`second`);
      const dispatch = jest.fn((x) => {
        if (x.subType === 'ADD_LAYER') {
          frame.datasourceLayers.second = mockDatasource.publicAPIMock;
        }
      });

      const component = mountWithIntl(<LayerPanels {...getDefaultProps()} dispatch={dispatch} />, {
        attachTo: container,
      });
      act(() => {
        component.find('[data-test-subj="lnsLayerAddButton"]').first().simulate('click');
      });
      const focusedEl = document.activeElement;
      expect(focusedEl?.children[0].getAttribute('data-test-subj')).toEqual('lns-layerPanel-1');
    });
  });
});
