/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { memo } from 'react';
import { createMemoryHistory } from 'history';
import { Provider } from 'react-redux';
import { I18nProvider } from '@kbn/i18n/react';
import { Router } from 'react-router-dom';
import { render as reactRender, RenderOptions, RenderResult } from '@testing-library/react';
import { CoreStart } from 'kibana/public';
import { EuiThemeProvider } from '../../../../../../legacy/common/eui_styled_components';
import { RouteCapture } from '../view/route_capture';
import {
  KibanaContextProvider,
  KibanaServices,
} from '../../../../../../../src/plugins/kibana_react/public';
import { appStoreFactory } from '../store';
import { coreMock } from '../../../../../../../src/core/public/mocks';

/**
 * Component that provides the endpoint application surrounding context providers.
 */
export const MockedAppContext = memo<{
  store: ReturnType<typeof appStoreFactory>;
  history: ReturnType<typeof createMemoryHistory>;
  services: KibanaServices;
  children: React.ReactElement;
}>(({ store, services, history, children }) => {
  return (
    <Provider store={store}>
      <I18nProvider>
        <KibanaContextProvider services={services}>
          <EuiThemeProvider>
            <Router history={history}>
              <RouteCapture>{children}</RouteCapture>
            </Router>
          </EuiThemeProvider>
        </KibanaContextProvider>
      </I18nProvider>
    </Provider>
  );
});

type UiRender = (ui: React.ReactElement, options?: RenderOptions) => RenderResult;

/**
 * Mocked app context renderer
 */
interface AppContextTestRender {
  store: ReturnType<typeof appStoreFactory>;
  history: ReturnType<typeof createMemoryHistory>;
  coreStart: jest.Mocked<CoreStart>;
  MockedAppContext: typeof MockedAppContext;
  render: UiRender;
}

/**
 * Creates a mocked endpoint app context custom renderer that can be used to render
 * component that depend upon the application's surrounding context providers.
 * Factory also returns the content that was used to create the custom renderer, allowing
 * for further customization.
 */
export const createAppContextTestRender = (): AppContextTestRender => {
  const store = appStoreFactory();
  const history = createMemoryHistory<never>();
  const coreStart = coreMock.createStart({ basePath: '/mock' });
  const { http, notifications, application } = coreStart;
  const wrapper: React.FunctionComponent<{ children: React.ReactElement }> = ({ children }) => (
    <MockedAppContext
      store={store}
      history={history}
      services={{ http, notifications, application }}
    >
      {children}
    </MockedAppContext>
  );
  const render: UiRender = (ui, options) => {
    // @ts-ignore
    return reactRender(ui, {
      wrapper,
      ...options,
    });
  };

  return {
    store,
    history,
    coreStart,
    MockedAppContext,
    render,
  };
};
