/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { ReactElement } from 'react';
import { render } from '@testing-library/react';
import { Router } from 'react-router-dom';
import { MemoryHistory } from 'history/createMemoryHistory';
import { createMemoryHistory, History } from 'history';
import { I18nProvider } from '@kbn/i18n/react';
import { mountWithIntl, renderWithIntl, shallowWithIntl } from '@kbn/test/jest';
import { coreMock } from 'src/core/public/mocks';
import { ChromeBreadcrumb } from 'kibana/public';
import { KibanaContextProvider } from '../../../../../../src/plugins/kibana_react/public';
import { MountWithReduxProvider } from './helper_with_redux';
import { AppState } from '../../state';

interface KibanaProviderOptions {
  coreOptions?: any;
  kibanaProps?: { services: any };
}

interface MockKibanaProviderProps extends KibanaProviderOptions {
  children: ReactElement;
}

interface MockRouterProps extends MockKibanaProviderProps {
  history?: History;
}

interface RenderKibanaOptions extends KibanaProviderOptions {
  renderOptions?: any;
}

interface RenderRouterOptions extends RenderKibanaOptions {
  history?: History;
}

/* default mock core */
const defaultCore = coreMock.createStart();
const mockCore: () => any = () => {
  const core = {
    ...defaultCore,
    application: {
      getUrlForApp: () => '/app/uptime',
      navigateToUrl: jest.fn(),
    },
  };

  return core;
};

/* Higher Order Components */
export function withKibanaContext<T>(
  WrappedComponent: React.ComponentType<T>,
  { kibanaProps, coreOptions }: KibanaProviderOptions
) {
  const core = {
    ...mockCore(),
    coreOptions,
  };
  return (props: any) => (
    <KibanaContextProvider services={{ ...core }} {...kibanaProps}>
      <I18nProvider>
        <WrappedComponent {...(props as T)} />
      </I18nProvider>
    </KibanaContextProvider>
  );
}

export function withRouter<T>(WrappedComponent: React.ComponentType<T>, customHistory: History) {
  const history = customHistory || createMemoryHistory();
  return (props: T) => (
    <Router history={history}>
      <WrappedComponent {...(props as T)} />
    </Router>
  );
}

/* Mock Provider Components */
export function MockKibanaProvider({
  children,
  coreOptions,
  kibanaProps,
}: MockKibanaProviderProps) {
  const core = {
    ...mockCore(),
    coreOptions,
  };
  return (
    <KibanaContextProvider services={{ ...core }} {...kibanaProps}>
      <I18nProvider>{children}</I18nProvider>
    </KibanaContextProvider>
  );
}

export function MockRouter({
  children,
  coreOptions,
  history: customHistory,
  kibanaProps,
}: MockRouterProps) {
  const history = customHistory || createMemoryHistory();
  return (
    <Router history={history}>
      <MockKibanaProvider coreOptions={coreOptions} kibanaProps={kibanaProps}>
        {children}
      </MockKibanaProvider>
    </Router>
  );
}

/* React testing library custom render functions */
export const renderTLWithKibana = (
  ui: ReactElement,
  { coreOptions, kibanaProps, renderOptions }: RenderKibanaOptions = {}
) => {
  return render(
    <MockKibanaProvider coreOptions={coreOptions} kibanaProps={kibanaProps}>
      {ui}
    </MockKibanaProvider>,
    renderOptions
  );
};

export const renderTLWithRouter = (
  ui: ReactElement,
  { history, coreOptions, kibanaProps, renderOptions }: RenderRouterOptions = {}
) => {
  return render(
    <MockRouter history={history} kibanaProps={kibanaProps} coreOptions={coreOptions}>
      {ui}
    </MockRouter>,
    renderOptions
  );
};

/* Enzyme helpers */
const helperWithRouter: <R>(
  helper: (node: ReactElement) => R,
  component: ReactElement,
  customHistory?: MemoryHistory,
  wrapReduxStore?: boolean,
  storeState?: AppState
) => R = (helper, component, customHistory, wrapReduxStore, storeState) => {
  const history = customHistory ?? createMemoryHistory();

  history.location.key = 'TestKeyForTesting';

  const routerWrapper = <Router history={history}>{component}</Router>;

  if (wrapReduxStore) {
    return helper(
      <MountWithReduxProvider store={storeState}>{routerWrapper}</MountWithReduxProvider>
    );
  }

  return helper(routerWrapper);
};

export const renderWithRouter = (component: ReactElement, customHistory?: MemoryHistory) => {
  return helperWithRouter(renderWithIntl, component, customHistory);
};

export const shallowWithRouter = (component: ReactElement, customHistory?: MemoryHistory) => {
  return helperWithRouter(shallowWithIntl, component, customHistory);
};

export const mountWithRouter = (component: ReactElement, customHistory?: MemoryHistory) => {
  return helperWithRouter(mountWithIntl, component, customHistory);
};

export const renderWithRouterRedux = (component: ReactElement, customHistory?: MemoryHistory) => {
  return helperWithRouter(renderWithIntl, component, customHistory, true);
};

export const shallowWithRouterRedux = (component: ReactElement, customHistory?: MemoryHistory) => {
  return helperWithRouter(shallowWithIntl, component, customHistory, true);
};

export const mountWithRouterRedux = (
  component: ReactElement,
  options?: { customHistory?: MemoryHistory; storeState?: AppState }
) => {
  return helperWithRouter(
    mountWithIntl,
    component,
    options?.customHistory,
    true,
    options?.storeState
  );
};
