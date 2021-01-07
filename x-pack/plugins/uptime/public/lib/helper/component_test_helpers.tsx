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
import { ChromeBreadcrumb } from 'kibana/public';
import {
  KibanaContextProvider,
  KibanaReactContextValue,
} from '../../../../../../src/plugins/kibana_react/public';
import { MountWithReduxProvider } from './helper_with_redux';
import { AppState } from '../../state';

/* default mock core */
const mockCore: () => any = () => {
  let breadcrumbObj: ChromeBreadcrumb[] = [];
  const core = {
    application: {
      getUrlForApp: () => '/app/uptime',
      navigateToUrl: jest.fn(),
    },
    chrome: {
      setBreadcrumbs: (newBreadcrumbs: ChromeBreadcrumb[]) => {
        breadcrumbObj = newBreadcrumbs;
      },
    },
  };

  return core;
};

/* Higher Order Components */
export function withKibanaContext<T>(
  WrappedComponent: React.ComponentType<T>,
  {
    kibanaProps,
    customCoreOptions,
  }: { kibanaProps?: KibanaReactContextValue<any>; customCoreOptions?: any }
) {
  const core = {
    ...mockCore(),
    customCoreOptions,
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
  customCoreOptions,
  kibanaProps,
}: {
  children: ReactElement;
  customCoreOptions?: any;
  kibanaProps?: KibanaReactContextValue<any>;
}) {
  const core = {
    ...mockCore(),
    customCoreOptions,
  };
  return (
    <KibanaContextProvider services={{ ...core }} {...kibanaProps}>
      <I18nProvider>{children}</I18nProvider>
    </KibanaContextProvider>
  );
}

export function MockRouter({
  children,
  customCoreOptions,
  customHistory,
  kibanaProps,
}: {
  children: ReactElement;
  customCoreOptions?: any;
  customHistory?: History;
  kibanaProps?: KibanaReactContextValue<any>;
}) {
  const history = customHistory || createMemoryHistory();
  return (
    <Router history={history}>
      <MockKibanaProvider customCoreOptions={customCoreOptions} kibanaProps={kibanaProps}>
        {children}
      </MockKibanaProvider>
    </Router>
  );
}

/* React testing library custom render functions */
export const renderTLWithKibana = (
  ui: ReactElement,
  {
    customCoreOptions,
    kibanaProps,
    renderOptions,
  }: {
    customCoreOptions?: any;
    kibanaProps?: KibanaReactContextValue<any>;
    renderOptions?: any;
  } = {}
) => {
  return render(
    <MockKibanaProvider {...kibanaProps} customCoreOptions={customCoreOptions}>
      {ui}
    </MockKibanaProvider>,
    renderOptions
  );
};

export const renderTLWithRouter = (
  ui: ReactElement,
  {
    customHistory,
    customCoreOptions,
    kibanaProps,
    renderOptions,
  }: {
    customHistory?: History;
    customCoreOptions?: any;
    kibanaProps?: KibanaReactContextValue<any>;
    renderOptions?: any;
  } = {}
) => {
  return render(
    <MockRouter
      customHistory={customHistory}
      kibanaProps={kibanaProps}
      customCoreOptions={customCoreOptions}
    >
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
