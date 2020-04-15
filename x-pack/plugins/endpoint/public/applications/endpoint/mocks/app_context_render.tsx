/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { createMemoryHistory } from 'history';
import { render as reactRender, RenderOptions, RenderResult } from '@testing-library/react';
import { appStoreFactory } from '../store';
import { coreMock } from '../../../../../../../src/core/public/mocks';
import { EndpointPluginStartDependencies } from '../../../plugin';
import { depsStartMock } from './dependencies_start_mock';
import { AppRootProvider } from '../view/app_root_provider';
import { createSpyMiddleware, MiddlewareActionSpyHelper } from '../store/test_utils';

type UiRender = (ui: React.ReactElement, options?: RenderOptions) => RenderResult;

/**
 * Mocked app root context renderer
 */
export interface AppContextTestRender {
  store: ReturnType<typeof appStoreFactory>;
  history: ReturnType<typeof createMemoryHistory>;
  coreStart: ReturnType<typeof coreMock.createStart>;
  depsStart: EndpointPluginStartDependencies;
  middlewareSpy: MiddlewareActionSpyHelper;
  /**
   * A wrapper around `AppRootContext` component. Uses the mocked modules as input to the
   * `AppRootContext`
   */
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
  const store = appStoreFactory({
    coreStart,
    depsStart,
    additionalMiddleware: [middlewareSpy.actionSpyMiddleware],
  });
  const AppWrapper: React.FunctionComponent<{ children: React.ReactElement }> = ({ children }) => (
    <AppRootProvider store={store} history={history} coreStart={coreStart} depsStart={depsStart}>
      {children}
    </AppRootProvider>
  );
  const render: UiRender = (ui, options) => {
    // @ts-ignore
    return reactRender(ui, {
      wrapper: AppWrapper,
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
