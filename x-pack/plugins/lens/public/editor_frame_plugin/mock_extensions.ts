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
  // due to a bug in TS 3.3.3333 `(...args: unknown[]) => unknown` doesn't
  // work here. After an upgrade to 3.4.3 this can be removed.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [K in keyof T]: T[K] extends (...args: any[]) => unknown
    ? jest.Mock<ReturnType<T[K]>, ArgumentType<T[K]>>
    : T[K]
};

export function createMockVisualization(): Mocked<Visualization> {
  return {
    getMappingOfTableToRoles: jest.fn((_state, _datasource) => []),
    getPersistableState: jest.fn(_state => ({})),
    getSuggestions: jest.fn(_options => []),
    initialize: jest.fn(_state => ({})),
    renderConfigPanel: jest.fn(),
    toExpression: jest.fn((_state, _datasource) => ''),
  };
}

export type DatasourceMock = Mocked<Datasource> & {
  publicAPIMock: Mocked<DatasourcePublicAPI>;
};

export function createMockDatasource(): DatasourceMock {
  const publicAPIMock: Mocked<DatasourcePublicAPI> = {
    getTableSpec: jest.fn(() => []),
    getOperationForColumnId: jest.fn(),
    renderDimensionPanel: jest.fn(),
    removeColumnInTableSpec: jest.fn(),
    moveColumnTo: jest.fn(),
    duplicateColumn: jest.fn(),
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
