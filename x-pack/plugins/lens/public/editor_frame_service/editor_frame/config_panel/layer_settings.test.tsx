/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen } from '@testing-library/react';
import faker from 'faker';
import { createMockFramePublicAPI, createMockVisualization } from '../../../mocks';
import { LayerSettings } from './layer_settings';
import { renderWithReduxStore } from '../../../mocks';

describe('LayerSettings', () => {
  const renderLayerSettings = (propsOverrides = {}) => {
    return renderWithReduxStore(
      <LayerSettings
        activeVisualization={createMockVisualization()}
        layerConfigProps={{
          layerId: 'myLayer',
          state: {},
          frame: createMockFramePublicAPI(),
          setState: jest.fn(),
          onChangeIndexPattern: jest.fn(),
        }}
        {...propsOverrides}
      />
    );
  };

  it('should render a static header if visualization has only a description value', () => {
    renderLayerSettings({
      activeVisualization: {
        ...createMockVisualization(),
        getDescription: () => ({ icon: 'myIcon', label: 'myVisualizationType' }),
      },
    });
    expect(screen.getByText('myVisualizationType')).toBeInTheDocument();
  });

  it('should use custom renderer if passed', () => {
    const customLayerHeader = faker.lorem.word();

    renderLayerSettings({
      activeVisualization: {
        ...createMockVisualization(),
        LayerHeaderComponent: () => <div>{customLayerHeader}</div>,
      },
    });
    expect(screen.getByText(customLayerHeader)).toBeInTheDocument();
  });
});
