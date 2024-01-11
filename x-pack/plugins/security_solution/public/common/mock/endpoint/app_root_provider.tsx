/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactNode } from 'react';
import React, { memo } from 'react';
import { Provider } from 'react-redux';
import { I18nProvider } from '@kbn/i18n-react';
import { Router } from '@kbn/shared-ux-router';
import type { History } from 'history';
import useObservable from 'react-use/lib/useObservable';
import type { Store } from 'redux';
import { EuiThemeProvider } from '@kbn/kibana-react-plugin/common';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import type { CoreStart } from '@kbn/core/public';
import { NavigationProvider } from '@kbn/security-solution-navigation';
import type { QueryClient } from '@tanstack/react-query';
import { QueryClientProvider } from '@tanstack/react-query';
import { UpsellingProvider } from '../../components/upselling_provider';
import { ConsoleManager } from '../../../management/components/console';
import { MockAssistantProvider } from '../mock_assistant_provider';
import { RouteCapture } from '../../components/endpoint/route_capture';
import type { StartPlugins, StartServices } from '../../../types';

/**
 * Provides the context for rendering the endpoint app
 */
export const AppRootProvider = memo<{
  store: Store;
  history: History;
  coreStart: CoreStart;
  depsStart: Pick<StartPlugins, 'data' | 'fleet'>;
  startServices: StartServices;
  queryClient: QueryClient;
  children: ReactNode | ReactNode[];
}>(({ store, history, coreStart, depsStart: { data }, queryClient, startServices, children }) => {
  const { theme: themeStart } = coreStart;
  const theme = useObservable(themeStart.theme$, themeStart.getTheme());
  const isDarkMode = theme.darkMode;

  return (
    <Provider store={store}>
      <I18nProvider>
        <KibanaContextProvider services={startServices}>
          <EuiThemeProvider darkMode={isDarkMode}>
            <QueryClientProvider client={queryClient}>
              <UpsellingProvider upsellingService={startServices.upselling}>
                <MockAssistantProvider>
                  <NavigationProvider core={coreStart}>
                    <Router history={history}>
                      <ConsoleManager>
                        <RouteCapture>{children}</RouteCapture>
                      </ConsoleManager>
                    </Router>
                  </NavigationProvider>
                </MockAssistantProvider>
              </UpsellingProvider>
            </QueryClientProvider>
          </EuiThemeProvider>
        </KibanaContextProvider>
      </I18nProvider>
    </Provider>
  );
});

AppRootProvider.displayName = 'AppRootProvider';
