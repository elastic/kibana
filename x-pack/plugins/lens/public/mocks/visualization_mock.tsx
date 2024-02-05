/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { LayerTypes } from '@kbn/expression-xy-plugin/public';
import { Visualization, VisualizationMap } from '../types';

export function createMockVisualization(id = 'testVis'): jest.Mocked<Visualization> {
  const layerId = 'layer1';

  return {
    id,
    clearLayer: jest.fn((state, _layerId, _indexPatternId) => state),
    removeLayer: jest.fn(),
    getLayerIds: jest.fn((_state) => [layerId]),
    getSupportedLayers: jest.fn(() => [{ type: LayerTypes.DATA, label: 'Data Layer' }]),
    getLayerType: jest.fn((_state, _layerId) => LayerTypes.DATA),
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
    getRenderEventCounters: jest.fn((_state) => []),
    initialize: jest.fn((_addNewLayer, _state) => ({ newState: 'newState' })),
    getConfiguration: jest.fn((props) => ({
      groups: [
        {
          groupId: 'a',
          groupLabel: 'a',
          layerId,
          supportsMoreColumns: true,
          accessors: [],
          filterOperations: jest.fn(() => true),
          dataTestSubj: 'mockVisA',
        },
      ],
    })),
    toExpression: jest.fn((_state, _frame) => 'expression'),
    toPreviewExpression: jest.fn((_state, _frame) => 'expression'),
    getUserMessages: jest.fn((_state) => []),
    setDimension: jest.fn(),
    removeDimension: jest.fn(),
    DimensionEditorComponent: jest.fn(() => <div data-test-subj="lnsVisDimensionEditor" />),
  };
}

export const mockVisualizationMap = (): VisualizationMap => {
  return {
    testVis: createMockVisualization(),
    testVis2: createMockVisualization(),
  };
};

export const visualizationMap = mockVisualizationMap();
