/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  createMockFramePublicAPI,
  createMockVisualization,
  mountWithProvider,
} from '../../../mocks';
import { Visualization } from '../../../types';
import { LayerSettings } from './layer_settings';

describe('LayerSettings', () => {
  let mockVisualization: jest.Mocked<Visualization>;
  const frame = createMockFramePublicAPI();

  function getDefaultProps() {
    return {
      activeVisualization: mockVisualization,
      layerConfigProps: {
        layerId: 'myLayer',
        state: {},
        frame,
        dateRange: { fromDate: 'now-7d', toDate: 'now' },
        activeData: frame.activeData,
        setState: jest.fn(),
      },
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
  });

  it('should render nothing with no custom renderer nor description', async () => {
    // @ts-expect-error
    mockVisualization.getDescription.mockReturnValue(undefined);
    const { instance } = await mountWithProvider(<LayerSettings {...getDefaultProps()} />);
    expect(instance.html()).toBe(null);
  });

  it('should render a static header if visualization has only a description value', async () => {
    mockVisualization.getDescription.mockReturnValue({
      icon: 'myIcon',
      label: 'myVisualizationType',
    });
    const { instance } = await mountWithProvider(<LayerSettings {...getDefaultProps()} />);
    expect(instance.find('StaticHeader').first().prop('label')).toBe('myVisualizationType');
  });

  it('should call the custom renderer if available', async () => {
    mockVisualization.renderLayerHeader = jest.fn();
    await mountWithProvider(<LayerSettings {...getDefaultProps()} />);
    expect(mockVisualization.renderLayerHeader).toHaveBeenCalled();
  });
});
