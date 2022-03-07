/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, ReactNode, useMemo } from 'react';
import { createMemoryHistory, MemoryHistory } from 'history';
import { render as reactRender, RenderOptions, RenderResult } from '@testing-library/react';
import { QueryClient, QueryClientProvider, setLogger } from 'react-query';
import { Router } from 'react-router-dom';
import { History } from 'history';
import useObservable from 'react-use/lib/useObservable';
import { I18nProvider } from '@kbn/i18n-react';
import { CoreStart } from 'src/core/public';
import { coreMock } from 'src/core/public/mocks';
import { KibanaContextProvider } from 'src/plugins/kibana_react/public';
import { EuiThemeProvider } from 'src/plugins/kibana_react/common';

type UiRender = (ui: React.ReactElement, options?: RenderOptions) => RenderResult;

// hide react-query output in console
setLogger({
  error: () => {},
  // eslint-disable-next-line no-console
  log: console.log,
  // eslint-disable-next-line no-console
  warn: console.warn,
});

/**
 * Mocked app root context renderer
 */
export interface AppContextTestRender {
  history: ReturnType<typeof createMemoryHistory>;
  coreStart: ReturnType<typeof coreMock.createStart>;
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

const createCoreStartMock = (
  history: MemoryHistory<never>
): ReturnType<typeof coreMock.createStart> => {
  const coreStart = coreMock.createStart({ basePath: '/mock' });

  // Mock the certain APP Ids returned by `application.getUrlForApp()`
  coreStart.application.getUrlForApp.mockImplementation((appId) => {
    switch (appId) {
      case 'sessionView':
        return '/app/sessionView';
      default:
        return `${appId} not mocked!`;
    }
  });

  coreStart.application.navigateToUrl.mockImplementation((url) => {
    history.push(url.replace('/app/sessionView', ''));
    return Promise.resolve();
  });

  return coreStart;
};

const AppRootProvider = memo<{
  history: History;
  coreStart: CoreStart;
  children: ReactNode | ReactNode[];
}>(({ history, coreStart: { http, notifications, uiSettings, application }, children }) => {
  const isDarkMode = useObservable<boolean>(uiSettings.get$('theme:darkMode'));
  const services = useMemo(
    () => ({ http, notifications, application }),
    [application, http, notifications]
  );
  return (
    <I18nProvider>
      <KibanaContextProvider services={services}>
        <EuiThemeProvider darkMode={isDarkMode}>
          <Router history={history}>{children}</Router>
        </EuiThemeProvider>
      </KibanaContextProvider>
    </I18nProvider>
  );
});

AppRootProvider.displayName = 'AppRootProvider';

/**
 * Creates a mocked app context custom renderer that can be used to render
 * component that depend upon the application's surrounding context providers.
 * Factory also returns the content that was used to create the custom renderer, allowing
 * for further customization.
 */

export const createAppRootMockRenderer = (): AppContextTestRender => {
  const history = createMemoryHistory<never>();
  const coreStart = createCoreStartMock(history);

  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        // turns retries off
        retry: false,
        // prevent jest did not exit errors
        cacheTime: Infinity,
      },
    },
  });

  const AppWrapper: React.FC<{ children: React.ReactElement }> = ({ children }) => (
    <AppRootProvider history={history} coreStart={coreStart}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </AppRootProvider>
  );

  const render: UiRender = (ui, options = {}) => {
    return reactRender(ui, {
      wrapper: AppWrapper as React.ComponentType,
      ...options,
    });
  };

  return {
    history,
    coreStart,
    AppWrapper,
    render,
  };
};
