/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { DatasourcePublicAPI } from '../types';

export const createMockVisualization = () => ({
  getMappingOfTableToRoles: jest.fn(() => []),
  getPersistableState: jest.fn(() => ({})),
  getSuggestions: jest.fn(() => []),
  initialize: jest.fn(() => {}),
  renderConfigPanel: jest.fn(),
  toExpression: jest.fn(() => ''),
});

export const createMockDatasource = () => {
  const publicAPIMock: DatasourcePublicAPI = {
    getTableSpec: jest.fn(() => []),
    getOperationForColumnId: jest.fn(() => null),
    renderDimensionPanel: jest.fn(),
    removeColumnInTableSpec: jest.fn(),
    moveColumnTo: jest.fn(),
    duplicateColumn: jest.fn(),
  };

  return {
    getDatasourceSuggestionsForField: jest.fn(() => []),
    getDatasourceSuggestionsFromCurrentState: jest.fn(() => []),
    getPersistableState: jest.fn(),
    getPublicAPI: jest.fn(() => publicAPIMock),
    initialize: jest.fn(() => Promise.resolve()),
    renderDataPanel: jest.fn(),
    toExpression: jest.fn(() => ''),

    // this is an additional property which doesn't exist on real datasources
    // but can be used to validate whether specific API mock functions are called
    publicAPIMock,
  };
};
