/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen } from '@testing-library/react';
import faker from 'faker';
import {
  createMockFramePublicAPI,
  createMockVisualization,
  renderWithReduxStore,
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
        onChangeIndexPattern: jest.fn(),
      },
    };
  }

  beforeEach(() => {
    mockVisualization = createMockVisualization();
  });

  it('should render a static header if visualization has only a description value', () => {
    mockVisualization.getDescription.mockReturnValue({
      icon: 'myIcon',
      label: 'myVisualizationType',
    });
    renderWithReduxStore(<LayerSettings {...getDefaultProps()} />);
    expect(screen.getByText('myVisualizationType')).toBeInTheDocument();
  });

  it('should use custom renderer if passed', () => {
    const customLayerHeader = faker.lorem.word();
    mockVisualization.LayerHeaderComponent = () => <div>{customLayerHeader}</div>;

    renderWithReduxStore(<LayerSettings {...getDefaultProps()} />);
    expect(screen.getByText(customLayerHeader)).toBeInTheDocument();
  });
});
