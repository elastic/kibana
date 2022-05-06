/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DatasourcePublicAPI, Datasource } from '../types';

export type DatasourceMock = jest.Mocked<Datasource> & {
  publicAPIMock: jest.Mocked<DatasourcePublicAPI>;
};

export function createMockDatasource(id: string): DatasourceMock {
  const publicAPIMock: jest.Mocked<DatasourcePublicAPI> = {
    datasourceId: id,
    getTableSpec: jest.fn(() => []),
    getOperationForColumnId: jest.fn(),
    getVisualDefaults: jest.fn(),
    getSourceId: jest.fn(),
    getFilters: jest.fn(),
  };

  return {
    id: 'testDatasource',
    clearLayer: jest.fn((state, _layerId) => state),
    getDatasourceSuggestionsForField: jest.fn((_state, _item, filterFn) => []),
    getDatasourceSuggestionsForVisualizeField: jest.fn((_state, _indexpatternId, _fieldName) => []),
    getDatasourceSuggestionsForVisualizeCharts: jest.fn((_state, _context) => []),
    getDatasourceSuggestionsFromCurrentState: jest.fn((_state) => []),
    getPersistableState: jest.fn((x) => ({
      state: x,
      savedObjectReferences: [{ type: 'index-pattern', id: 'mockip', name: 'mockip' }],
    })),
    getPublicAPI: jest.fn().mockReturnValue(publicAPIMock),
    initialize: jest.fn((_state?) => Promise.resolve()),
    renderDataPanel: jest.fn(),
    renderLayerPanel: jest.fn(),
    getCurrentIndexPatternId: jest.fn(),
    toExpression: jest.fn((_frame, _state) => null),
    insertLayer: jest.fn((_state, _newLayerId) => ({})),
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
    checkIntegrity: jest.fn((_state) => []),
    isTimeBased: jest.fn(),
    isValidColumn: jest.fn(),
    isEqual: jest.fn(),
  };
}

export function mockDatasourceMap() {
  const datasource = createMockDatasource('testDatasource');
  datasource.getDatasourceSuggestionsFromCurrentState.mockReturnValue([
    {
      state: {},
      table: {
        columns: [],
        isMultiRow: true,
        layerId: 'a',
        changeType: 'unchanged',
      },
      keptLayerIds: ['a'],
    },
  ]);

  datasource.getLayers.mockReturnValue(['a']);
  return {
    testDatasource2: createMockDatasource('testDatasource2'),
    testDatasource: datasource,
  };
}

export const datasourceMap = mockDatasourceMap();
