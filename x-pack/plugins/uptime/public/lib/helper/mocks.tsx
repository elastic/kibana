/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { ReactElement } from 'react';
import { of } from 'rxjs';
import { Provider as ReduxProvider } from 'react-redux';
import { mountWithIntl, renderWithIntl, shallowWithIntl } from '@kbn/test/jest';
import { render as reactTestLibRender, RenderOptions } from '@testing-library/react';
import type { MemoryHistory } from 'history/createMemoryHistory';
import { Router } from 'react-router-dom';
import { createMemoryHistory, History } from 'history';
import { CoreStart } from 'kibana/public';
import { I18nProvider } from '@kbn/i18n/react';
import { coreMock } from 'src/core/public/mocks';
import { configure } from '@testing-library/dom';
import { mockState } from '../__mocks__/uptime_store.mock';
import { EuiThemeProvider } from '../../../../../../src/plugins/kibana_react/common';
import {
  KibanaContextProvider,
  KibanaServices,
} from '../../../../../../src/plugins/kibana_react/public';

import { AppState } from '../../state';
import { stringifyUrlParams } from './stringify_url_params';

interface KibanaProps {
  services?: KibanaServices;
}

export interface KibanaProviderOptions<ExtraCore> {
  core?: Partial<CoreStart> & ExtraCore;
  kibanaProps?: KibanaProps;
}

interface MockKibanaProviderProps<ExtraCore> extends KibanaProviderOptions<ExtraCore> {
  children: ReactElement;
}

interface MockRouterProps<ExtraCore> extends MockKibanaProviderProps<ExtraCore> {
  history?: History;
}

type Url =
  | string
  | {
      path: string;
      queryParams: Record<string, string | number>;
    };

interface RenderRouterOptions<ExtraCore> extends KibanaProviderOptions<ExtraCore> {
  history?: History;
  renderOptions?: Omit<RenderOptions, 'queries'>;
  state?: Partial<AppState>;
  url?: Url;
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
    uiSettings: {
      get: (key: string) => 'MMM D, YYYY @ HH:mm:ss.SSS',
      get$: (key: string) => of('MMM D, YYYY @ HH:mm:ss.SSS'),
    },
    usageCollection: { reportUiCounter: () => {} },
  };

  return core;
};

/* Mock Provider Components */
export function MockKibanaProvider<ExtraCore>({
  children,
  core,
  kibanaProps,
}: MockKibanaProviderProps<ExtraCore>) {
  const coreOptions = {
    ...mockCore(),
    ...core,
  };
  return (
    <KibanaContextProvider services={{ ...coreOptions }} {...kibanaProps}>
      <EuiThemeProvider darkMode={false}>
        <I18nProvider>{children}</I18nProvider>
      </EuiThemeProvider>
    </KibanaContextProvider>
  );
}

export function MockRouter<ExtraCore>({
  children,
  core,
  history = createMemoryHistory(),
  kibanaProps,
}: MockRouterProps<ExtraCore>) {
  return (
    <Router history={history}>
      <MockKibanaProvider core={core} kibanaProps={kibanaProps}>
        {children}
      </MockKibanaProvider>
    </Router>
  );
}
configure({ testIdAttribute: 'data-test-subj' });

/* Custom react testing library render */
export function render<ExtraCore>(
  ui: ReactElement,
  {
    history = createMemoryHistory(),
    core,
    kibanaProps,
    renderOptions,
    state,
    url,
  }: RenderRouterOptions<ExtraCore> = {}
) {
  const testState: AppState = {
    ...mockState,
    ...state,
  };

  if (url) {
    history = getHistoryFromUrl(url);
  }

  return {
    ...reactTestLibRender(
      <MountWithReduxProvider state={testState}>
        <MockRouter history={history} kibanaProps={kibanaProps} core={core}>
          {ui}
        </MockRouter>
      </MountWithReduxProvider>,
      renderOptions
    ),
    history,
  };
}

export const MountWithReduxProvider: React.FC<{ state?: AppState }> = ({ children, state }) => (
  <ReduxProvider
    store={{
      dispatch: jest.fn(),
      getState: jest.fn().mockReturnValue(state || { selectedFilters: null }),
      subscribe: jest.fn(),
      replaceReducer: jest.fn(),
    }}
  >
    {children}
  </ReduxProvider>
);

interface RenderRouterOptions<ExtraCore> extends KibanaProviderOptions<ExtraCore> {
  history?: History;
  state?: Partial<AppState>;
}

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
      <MountWithReduxProvider state={storeState}>{routerWrapper}</MountWithReduxProvider>
    );
  }

  return helper(routerWrapper);
};

export const renderWithRouter = (component: ReactElement, customHistory?: MemoryHistory) => {
  return helperWithRouter(renderWithIntl, component, customHistory);
};

export const renderWithRouterRedux = (component: ReactElement, customHistory?: MemoryHistory) => {
  return helperWithRouter(renderWithIntl, component, customHistory, true);
};

export const shallowWithRouter = (component: ReactElement, customHistory?: MemoryHistory) => {
  return helperWithRouter(shallowWithIntl, component, customHistory);
};

export const shallowWithRouterRedux = (component: ReactElement, customHistory?: MemoryHistory) => {
  return helperWithRouter(shallowWithIntl, component, customHistory, true);
};

export const mountWithRouter = (component: ReactElement, customHistory?: MemoryHistory) => {
  return helperWithRouter(mountWithIntl, component, customHistory);
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

const getHistoryFromUrl = (url: Url) => {
  if (typeof url === 'string') {
    return createMemoryHistory({
      initialEntries: [url],
    });
  }

  return createMemoryHistory({
    initialEntries: [url.path + stringifyUrlParams(url.queryParams)],
  });
};
