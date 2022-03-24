/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { layerTypes } from '../../common';
import { Visualization, VisualizationMap } from '../types';

export function createMockVisualization(id = 'testVis'): jest.Mocked<Visualization> {
  return {
    id,
    clearLayer: jest.fn((state, _layerId) => state),
    removeLayer: jest.fn(),
    getLayerIds: jest.fn((_state) => ['layer1']),
    getSupportedLayers: jest.fn(() => [{ type: layerTypes.DATA, label: 'Data Layer' }]),
    getLayerType: jest.fn((_state, _layerId) => layerTypes.DATA),
    visualizationTypes: [
      {
        icon: 'empty',
        id,
        label: 'TEST',
        groupLabel: `${id}Group`,
      },
    ],
    appendLayer: jest.fn(),
    getVisualizationTypeId: jest.fn((_state) => 'empty'),
    getDescription: jest.fn((_state) => ({ label: '' })),
    switchVisualizationType: jest.fn((_, x) => x),
    getSuggestions: jest.fn((_options) => []),
    initialize: jest.fn((_frame, _state?) => ({ newState: 'newState' })),
    getConfiguration: jest.fn((props) => ({
      groups: [
        {
          groupId: 'a',
          groupLabel: 'a',
          layerId: 'layer1',
          supportsMoreColumns: true,
          accessors: [],
          filterOperations: jest.fn(() => true),
          dataTestSubj: 'mockVisA',
        },
      ],
    })),
    toExpression: jest.fn((_state, _frame) => null),
    toPreviewExpression: jest.fn((_state, _frame) => null),

    setDimension: jest.fn(),
    removeDimension: jest.fn(),
    getErrorMessages: jest.fn((_state) => undefined),
    renderDimensionEditor: jest.fn(),
  };
}

export const mockVisualizationMap = (): VisualizationMap => {
  return {
    testVis: createMockVisualization(),
    testVis2: createMockVisualization(),
  };
};

export const visualizationMap = mockVisualizationMap();
