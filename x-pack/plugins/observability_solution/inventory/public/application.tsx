/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { CoreStart, CoreTheme } from '@kbn/core/public';
import { RedirectAppLinks } from '@kbn/shared-ux-link-redirect-app';
import type { History } from 'history';
import React, { useMemo } from 'react';
import type { Observable } from 'rxjs';
import { RouteRenderer, RouterProvider } from '@kbn/typed-react-router-config';
import { KibanaRenderContextProvider } from '@kbn/react-kibana-context-render';
import type { InventoryStartDependencies } from './types';
import { inventoryRouter } from './routes/config';
import { InventoryKibanaContext } from './hooks/use_kibana';
import { InventoryServices } from './services/types';
import { InventoryContextProvider } from './components/inventory_context_provider';

function Application({
  coreStart,
  history,
  pluginsStart,
  theme$,
  services,
}: {
  coreStart: CoreStart;
  history: History;
  pluginsStart: InventoryStartDependencies;
  theme$: Observable<CoreTheme>;
  services: InventoryServices;
}) {
  const theme = useMemo(() => {
    return { theme$ };
  }, [theme$]);

  const context: InventoryKibanaContext = useMemo(
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
    <KibanaRenderContextProvider
      theme={theme}
      i18n={coreStart.i18n}
      analytics={coreStart.analytics}
    >
      <InventoryContextProvider context={context}>
        <RedirectAppLinks coreStart={coreStart}>
          <coreStart.i18n.Context>
            <RouterProvider history={history} router={inventoryRouter as any}>
              <RouteRenderer />
            </RouterProvider>
          </coreStart.i18n.Context>
        </RedirectAppLinks>
      </InventoryContextProvider>
    </KibanaRenderContextProvider>
  );
}

export { Application };
