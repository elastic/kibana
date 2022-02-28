/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  NotificationsStart,
  HttpStart,
  OverlayStart,
  SavedObjectsClientContract,
} from 'kibana/public';
import createSagaMiddleware from 'redux-saga';
import { createStore, applyMiddleware, AnyAction } from 'redux';
import { ChromeStart } from 'kibana/public';
import { GraphStoreDependencies, createRootReducer, GraphStore, GraphState } from './store';
import { Workspace } from '../types';
import { IndexPattern } from '../../../../../src/plugins/data/public';

export interface MockedGraphEnvironment {
  store: GraphStore;
  mockedDeps: jest.Mocked<GraphStoreDependencies>;
}

/**
 * Creates a graph store with original reducers registered but mocked out dependencies.
 * This can be used to test a component in a realistic stateful setting and to test sagas
 * in their natural habitat by passing them in via options in the `sagas` array.
 *
 * The existing mocks are as barebone as possible, if you need specific values to be returned
 * from mocked dependencies, you can pass in `mockedDepsOverwrites` via options.
 */
export function createMockGraphStore({
  sagas = [],
  mockedDepsOverwrites = {},
  initialStateOverwrites,
}: {
  sagas?: Array<(deps: GraphStoreDependencies) => () => Iterator<unknown>>;
  mockedDepsOverwrites?: Partial<jest.Mocked<GraphStoreDependencies>>;
  initialStateOverwrites?: Partial<GraphState>;
}): MockedGraphEnvironment {
  const workspaceMock = {
    runLayout: jest.fn(),
    simpleSearch: jest.fn(),
    nodes: [],
    edges: [],
    options: {},
    blocklistedNodes: [],
  } as unknown as Workspace;

  const mockedDeps: jest.Mocked<GraphStoreDependencies> = {
    basePath: '',
    addBasePath: jest.fn((url: string) => url),
    changeUrl: jest.fn(),
    chrome: {
      setBreadcrumbs: jest.fn(),
    } as unknown as ChromeStart,
    createWorkspace: jest.fn((index, advancedSettings) => workspaceMock),
    getWorkspace: jest.fn(() => workspaceMock),
    indexPatternProvider: {
      get: jest.fn(async (id: string) => {
        if (id === 'missing-dataview') {
          throw Error('No data view with this id');
        }
        return { id: '123', title: 'test-pattern' } as unknown as IndexPattern;
      }),
    },
    I18nContext: jest
      .fn()
      .mockImplementation(({ children }: { children: React.ReactNode }) => children),
    notifications: {
      toasts: {
        addDanger: jest.fn(),
        addSuccess: jest.fn(),
      },
    } as unknown as NotificationsStart,
    http: {} as HttpStart,
    notifyReact: jest.fn(),
    savePolicy: 'configAndData',
    showSaveModal: jest.fn(),
    overlays: {
      openModal: jest.fn(),
    } as unknown as OverlayStart,
    savedObjectsClient: {
      find: jest.fn(),
      get: jest.fn(),
    } as unknown as SavedObjectsClientContract,
    handleSearchQueryError: jest.fn(),
    ...mockedDepsOverwrites,
  };
  const sagaMiddleware = createSagaMiddleware();

  const rootReducer = createRootReducer(mockedDeps.addBasePath);
  const initializedRootReducer = (state: GraphState | undefined, action: AnyAction) =>
    rootReducer(state || (initialStateOverwrites as GraphState), action);

  const store = createStore(initializedRootReducer, applyMiddleware(sagaMiddleware));

  store.dispatch = jest.fn(store.dispatch);

  sagas.forEach((sagaCreator) => {
    sagaMiddleware.run(sagaCreator(mockedDeps));
  });

  return { store, mockedDeps };
}
