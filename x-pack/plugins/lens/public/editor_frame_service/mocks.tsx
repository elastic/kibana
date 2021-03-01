/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { PaletteDefinition } from 'src/plugins/charts/public';
import {
  ReactExpressionRendererProps,
  ExpressionsSetup,
  ExpressionsStart,
} from '../../../../../src/plugins/expressions/public';
import { embeddablePluginMock } from '../../../../../src/plugins/embeddable/public/mocks';
import { expressionsPluginMock } from '../../../../../src/plugins/expressions/public/mocks';
import { DatasourcePublicAPI, FramePublicAPI, Datasource, Visualization } from '../types';
import { EditorFrameSetupPlugins, EditorFrameStartPlugins } from './service';
import { dataPluginMock } from '../../../../../src/plugins/data/public/mocks';
import { chartPluginMock } from '../../../../../src/plugins/charts/public/mocks';

export function createMockVisualization(): jest.Mocked<Visualization> {
  return {
    id: 'TEST_VIS',
    clearLayer: jest.fn((state, _layerId) => state),
    getLayerIds: jest.fn((_state) => ['layer1']),
    visualizationTypes: [
      {
        icon: 'empty',
        id: 'TEST_VIS',
        label: 'TEST',
      },
    ],
    getVisualizationTypeId: jest.fn((_state) => 'empty'),
    getDescription: jest.fn((_state) => ({ label: '' })),
    switchVisualizationType: jest.fn((_, x) => x),
    getSuggestions: jest.fn((_options) => []),
    initialize: jest.fn((_frame, _state?) => ({})),
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
  };
}

export type DatasourceMock = jest.Mocked<Datasource> & {
  publicAPIMock: jest.Mocked<DatasourcePublicAPI>;
};

export function createMockDatasource(id: string): DatasourceMock {
  const publicAPIMock: jest.Mocked<DatasourcePublicAPI> = {
    datasourceId: id,
    getTableSpec: jest.fn(() => []),
    getOperationForColumnId: jest.fn(),
  };

  return {
    id: 'mockindexpattern',
    clearLayer: jest.fn((state, _layerId) => state),
    getDatasourceSuggestionsForField: jest.fn((_state, _item) => []),
    getDatasourceSuggestionsForVisualizeField: jest.fn((_state, _indexpatternId, _fieldName) => []),
    getDatasourceSuggestionsFromCurrentState: jest.fn((_state) => []),
    getPersistableState: jest.fn((x) => ({ state: x, savedObjectReferences: [] })),
    getPublicAPI: jest.fn().mockReturnValue(publicAPIMock),
    initialize: jest.fn((_state?) => Promise.resolve()),
    renderDataPanel: jest.fn(),
    renderLayerPanel: jest.fn(),
    toExpression: jest.fn((_frame, _state) => null),
    insertLayer: jest.fn((_state, _newLayerId) => {}),
    removeLayer: jest.fn((_state, _layerId) => {}),
    removeColumn: jest.fn((props) => {}),
    getLayers: jest.fn((_state) => []),
    uniqueLabels: jest.fn((_state) => ({})),
    renderDimensionTrigger: jest.fn(),
    renderDimensionEditor: jest.fn(),
    getDropProps: jest.fn(),
    onDrop: jest.fn(),

    // this is an additional property which doesn't exist on real datasources
    // but can be used to validate whether specific API mock functions are called
    publicAPIMock,
    getErrorMessages: jest.fn((_state) => undefined),
  };
}

export type FrameMock = jest.Mocked<FramePublicAPI>;

export function createMockPaletteDefinition(): jest.Mocked<PaletteDefinition> {
  return {
    getColors: jest.fn((_) => ['#ff0000', '#00ff00']),
    title: 'Mock Palette',
    id: 'default',
    renderEditor: jest.fn(),
    toExpression: jest.fn(() => ({
      type: 'expression',
      chain: [
        {
          type: 'function',
          function: 'mock_palette',
          arguments: {},
        },
      ],
    })),
    getColor: jest.fn().mockReturnValue('#ff0000'),
  };
}

export function createMockFramePublicAPI(): FrameMock {
  const palette = createMockPaletteDefinition();
  return {
    datasourceLayers: {},
    addNewLayer: jest.fn(() => ''),
    removeLayers: jest.fn(),
    dateRange: { fromDate: 'now-7d', toDate: 'now' },
    query: { query: '', language: 'lucene' },
    filters: [],
    availablePalettes: {
      get: () => palette,
      getAll: () => [palette],
    },
    searchSessionId: 'sessionId',
  };
}

type Omit<T, K> = Pick<T, Exclude<keyof T, K>>;

export type MockedSetupDependencies = Omit<EditorFrameSetupPlugins, 'expressions'> & {
  expressions: jest.Mocked<ExpressionsSetup>;
};

export type MockedStartDependencies = Omit<EditorFrameStartPlugins, 'expressions'> & {
  expressions: jest.Mocked<ExpressionsStart>;
};

export function createExpressionRendererMock(): jest.Mock<
  React.ReactElement,
  [ReactExpressionRendererProps]
> {
  return jest.fn((_) => <span />);
}

export function createMockSetupDependencies() {
  return ({
    data: dataPluginMock.createSetupContract(),
    embeddable: embeddablePluginMock.createSetupContract(),
    expressions: expressionsPluginMock.createSetupContract(),
    charts: chartPluginMock.createSetupContract(),
  } as unknown) as MockedSetupDependencies;
}

export function createMockStartDependencies() {
  return ({
    data: dataPluginMock.createSetupContract(),
    embeddable: embeddablePluginMock.createStartContract(),
    expressions: expressionsPluginMock.createStartContract(),
    charts: chartPluginMock.createStartContract(),
  } as unknown) as MockedStartDependencies;
}
