/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { DatasourcePublicAPI, Visualization, Datasource } from '../types';

export function createMockVisualization(): jest.Mocked<Visualization> {
  return {
    getPersistableState: jest.fn(_state => ({})),
    getSuggestions: jest.fn(_options => []),
    initialize: jest.fn(_state => ({})),
    renderConfigPanel: jest.fn(),
    toExpression: jest.fn((_state, _datasource) => ''),
  };
}

export type DatasourceMock = jest.Mocked<Datasource> & {
  publicAPIMock: jest.Mocked<DatasourcePublicAPI>;
};

export function createMockDatasource(): DatasourceMock {
  const publicAPIMock: jest.Mocked<DatasourcePublicAPI> = {
    getTableSpec: jest.fn(() => []),
    getOperationForColumnId: jest.fn(),
    renderDimensionPanel: jest.fn(),
    removeColumnInTableSpec: jest.fn(),
    moveColumnTo: jest.fn(),
    duplicateColumn: jest.fn(),
    generateColumnId: jest.fn(),
  };

  return {
    getDatasourceSuggestionsForField: jest.fn(_state => []),
    getDatasourceSuggestionsFromCurrentState: jest.fn(_state => []),
    getPersistableState: jest.fn(),
    getPublicAPI: jest.fn((_state, _setState) => publicAPIMock),
    initialize: jest.fn(_state => Promise.resolve()),
    renderDataPanel: jest.fn(),
    toExpression: jest.fn(_state => ''),

    // this is an additional property which doesn't exist on real datasources
    // but can be used to validate whether specific API mock functions are called
    publicAPIMock,
  };
}
