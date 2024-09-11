/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { CoreStart, CoreTheme } from '@kbn/core/public';
import { KibanaThemeProvider } from '@kbn/react-kibana-context-theme';
import { RedirectAppLinks } from '@kbn/shared-ux-link-redirect-app';
import { Route, Router, Routes } from '@kbn/shared-ux-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import type { History } from 'history';
import React, { useMemo } from 'react';
import type { Observable } from 'rxjs';
import { InvestigateAppContextProvider } from './components/investigate_app_context_provider';
import { InvestigateAppKibanaContext } from './hooks/use_kibana';
import { getRoutes } from './routes/config';
import { InvestigateAppServices } from './services/types';
import type { InvestigateAppStartDependencies } from './types';

const queryClient = new QueryClient();

function Application({
  coreStart,
  history,
  pluginsStart,
  theme$,
  services,
}: {
  coreStart: CoreStart;
  history: History;
  pluginsStart: InvestigateAppStartDependencies;
  theme$: Observable<CoreTheme>;
  services: InvestigateAppServices;
}) {
  const theme = useMemo(() => {
    return { theme$ };
  }, [theme$]);

  const context: InvestigateAppKibanaContext = useMemo(
    () => ({
      core: coreStart,
      dependencies: {
        start: pluginsStart,
      },
      services,
    }),
    [coreStart, pluginsStart, services]
  );

  const App = () => {
    const routes = getRoutes();
    return (
      <Routes>
        {Object.keys(routes).map((path) => {
          const { handler, exact } = routes[path];
          const Wrapper = () => {
            return handler();
          };
          return <Route key={path} path={path} exact={exact} component={Wrapper} />;
        })}
      </Routes>
    );
  };

  return (
    <KibanaThemeProvider theme={theme}>
      <InvestigateAppContextProvider context={context}>
        <RedirectAppLinks coreStart={coreStart}>
          <coreStart.i18n.Context>
            <Router history={history}>
              <QueryClientProvider client={queryClient}>
                <App />
                <ReactQueryDevtools initialIsOpen={false} />
              </QueryClientProvider>
            </Router>
          </coreStart.i18n.Context>
        </RedirectAppLinks>
      </InvestigateAppContextProvider>
    </KibanaThemeProvider>
  );
}

export { Application };
