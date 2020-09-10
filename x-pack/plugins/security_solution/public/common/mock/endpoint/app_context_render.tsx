/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { createMemoryHistory } from 'history';
import { render as reactRender, RenderOptions, RenderResult } from '@testing-library/react';
import { Store } from 'redux';

import { coreMock } from '../../../../../../../src/core/public/mocks';
import { StartPlugins } from '../../../types';
import { depsStartMock } from './dependencies_start_mock';
import { MiddlewareActionSpyHelper, createSpyMiddleware } from '../../store/test_utils';
import { apolloClientObservable, kibanaObservable } from '../test_providers';
import { createStore, State } from '../../store';
import { AppRootProvider } from './app_root_provider';
import { managementMiddlewareFactory } from '../../../management/store/middleware';
import { createKibanaContextProviderMock } from '../../lib/kibana/kibana_react.mock';
import { SUB_PLUGINS_REDUCER, mockGlobalState, createSecuritySolutionStorageMock } from '..';

type UiRender = (ui: React.ReactElement, options?: RenderOptions) => RenderResult;

/**
 * Mocked app root context renderer
 */
export interface AppContextTestRender {
  store: Store<State>;
  history: ReturnType<typeof createMemoryHistory>;
  coreStart: ReturnType<typeof coreMock.createStart>;
  depsStart: Pick<StartPlugins, 'data' | 'ingestManager'>;
  middlewareSpy: MiddlewareActionSpyHelper;
  /**
   * A wrapper around `AppRootContext` component. Uses the mocked modules as input to the
   * `AppRootContext`
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  AppWrapper: React.FC<any>;
  /**
   * Renders the given UI within the created `AppWrapper` providing the given UI a mocked
   * endpoint runtime context environment
   */
  render: UiRender;
}

/**
 * Creates a mocked endpoint app context custom renderer that can be used to render
 * component that depend upon the application's surrounding context providers.
 * Factory also returns the content that was used to create the custom renderer, allowing
 * for further customization.
 */
export const createAppRootMockRenderer = (): AppContextTestRender => {
  const history = createMemoryHistory<never>();
  const coreStart = coreMock.createStart({ basePath: '/mock' });
  const depsStart = depsStartMock();
  const middlewareSpy = createSpyMiddleware();
  const { storage } = createSecuritySolutionStorageMock();

  const store = createStore(
    mockGlobalState,
    SUB_PLUGINS_REDUCER,
    apolloClientObservable,
    kibanaObservable,
    storage,
    [...managementMiddlewareFactory(coreStart, depsStart), middlewareSpy.actionSpyMiddleware]
  );

  const MockKibanaContextProvider = createKibanaContextProviderMock();

  const AppWrapper: React.FC<{ children: React.ReactElement }> = ({ children }) => (
    <MockKibanaContextProvider>
      <AppRootProvider store={store} history={history} coreStart={coreStart} depsStart={depsStart}>
        {children}
      </AppRootProvider>
    </MockKibanaContextProvider>
  );
  const render: UiRender = (ui, options) => {
    return reactRender(ui, {
      wrapper: AppWrapper as React.ComponentType,
      ...options,
    });
  };

  return {
    store,
    history,
    coreStart,
    depsStart,
    middlewareSpy,
    AppWrapper,
    render,
  };
};
