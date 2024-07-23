/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { CoreStart, CoreTheme } from '@kbn/core/public';
import { KibanaThemeProvider } from '@kbn/react-kibana-context-theme';
import { RedirectAppLinks } from '@kbn/shared-ux-link-redirect-app';
import type { History } from 'history';
import React, { useMemo } from 'react';
import type { Observable } from 'rxjs';
import { RouteRenderer, RouterProvider } from '@kbn/typed-react-router-config';
import type { InvestigateAppStartDependencies } from './types';
import { investigateRouter } from './routes/config';
import { InvestigateAppKibanaContext } from './hooks/use_kibana';
import { InvestigateAppServices } from './services/types';
import { InvestigateAppContextProvider } from './components/investigate_app_context_provider';

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

  return (
    <KibanaThemeProvider theme={theme}>
      <InvestigateAppContextProvider context={context}>
        <RedirectAppLinks coreStart={coreStart}>
          <coreStart.i18n.Context>
            <RouterProvider history={history} router={investigateRouter as any}>
              <RouteRenderer />
            </RouterProvider>
          </coreStart.i18n.Context>
        </RedirectAppLinks>
      </InvestigateAppContextProvider>
    </KibanaThemeProvider>
  );
}

export { Application };
