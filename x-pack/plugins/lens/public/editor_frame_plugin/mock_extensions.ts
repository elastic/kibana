/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { DatasourcePublicAPI, Visualization, Datasource } from '../types';

type ArgumentType<T> = T extends (...args: infer A) => unknown ? A : unknown[];

// This type returns a mocked version of type T to allow the caller to access
// the mock APIs in a type safe way
type Mocked<T> = {
  [K in keyof T]: T[K] extends (...args: unknown[]) => unknown
    ? jest.Mock<ReturnType<T[K]>, ArgumentType<T[K]> | []>
    : T[K]
};

export const createMockVisualization = () =>
  ({
    getMappingOfTableToRoles: jest.fn(() => []),
    getPersistableState: jest.fn(() => ({})),
    getSuggestions: jest.fn(() => []),
    initialize: jest.fn(() => ({})),
    renderConfigPanel: jest.fn(),
    toExpression: jest.fn(() => ''),
  } as Mocked<Visualization>);

export const createMockDatasource = () => {
  const publicAPIMock: Mocked<DatasourcePublicAPI> = {
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
  } as Mocked<Datasource> & { publicAPIMock: Mocked<DatasourcePublicAPI> };
};
