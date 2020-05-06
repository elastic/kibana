/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { createMemoryHistory } from 'history';
import { render as reactRender, RenderOptions, RenderResult } from '@testing-library/react';
import { applyMiddleware, createStore, Reducer, Store } from 'redux';
import { composeWithDevTools } from 'redux-devtools-extension';
import { coreMock } from '../../../../../../../src/core/public/mocks';
import { EndpointPluginStartDependencies } from '../../../plugin';
import { depsStartMock } from './dependencies_start_mock';
import { AppRootProvider } from '../view/app_root_provider';
import { createSpyMiddleware, MiddlewareActionSpyHelper } from '../store/test_utils';
import { AppAction, SubpluginProviderDefinition } from '../types';

type UiRender = (ui: React.ReactElement, options?: RenderOptions) => RenderResult;

/**
 * Mocked app root context renderer
 */
export interface AppContextTestRender<S> {
  store: Store<S, AppAction>;
  history: ReturnType<typeof createMemoryHistory>;
  coreStart: ReturnType<typeof coreMock.createStart>;
  depsStart: EndpointPluginStartDependencies;
  middlewareSpy: MiddlewareActionSpyHelper<S>;
  /**
   * A wrapper around `AppRootContext` component. Uses the mocked modules as input to the
   * `AppRootContext`
   */
  AppWrapper: React.FC<{ children: React.ReactChildren }>;
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
export function createAppRootMockRenderer<S extends {}>(
  subpluginDefinition: Pick<SubpluginProviderDefinition<S>, 'reducer' | 'middleware'>
): AppContextTestRender<S> {
  const history = createMemoryHistory<never>();
  const coreStart = coreMock.createStart({ basePath: '/mock' });
  const params = coreMock.createAppMountParamters('/mock');
  const depsStart = depsStartMock();
  const middlewareSpyHelper = createSpyMiddleware<S>();
  const composeWithReduxDevTools = composeWithDevTools({ name: 'EndpointApp' });
  const { reducer } = subpluginDefinition;
  const middleware = subpluginDefinition.middleware(coreStart, depsStart, params);
  const enhancedMiddleware = composeWithReduxDevTools(
    applyMiddleware(middleware, middlewareSpyHelper.actionSpyMiddleware)
  );

  const store = createStore(reducer as Reducer<S, AppAction>, enhancedMiddleware); // TODO: Fix this shit
  const AppWrapper = ({ children }: { children: React.ReactChildren }) => (
    <AppRootProvider store={store} history={history} coreStart={coreStart} depsStart={depsStart}>
      {children}
    </AppRootProvider>
  );
  const render: UiRender = (ui, options) => {
    return reactRender(ui, {
      wrapper: AppWrapper as React.ComponentType<{}>, // The typescript type definition for this is wrong. Should accept children but doesn't
      ...options,
    });
  };

  return {
    store,
    history,
    coreStart,
    depsStart,
    middlewareSpy: middlewareSpyHelper,
    AppWrapper,
    render,
  };
}
