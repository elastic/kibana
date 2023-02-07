/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AppMountParameters, CoreSetup, CoreStart } from '@kbn/core/public';
import { KibanaContextProvider, KibanaThemeProvider } from '@kbn/kibana-react-plugin/public';
import { Storage } from '@kbn/kibana-utils-plugin/public';
import { RedirectAppLinks } from '@kbn/shared-ux-link-redirect-app';
import { RouteRenderer, RouterProvider } from '@kbn/typed-react-router-config';
import React, { useMemo } from 'react';
import ReactDOM from 'react-dom';
import { HeaderMenuPortal } from '@kbn/observability-plugin/public';
import { CheckSetup } from './components/check_setup';
import { ProfilingDependenciesContextProvider } from './components/contexts/profiling_dependencies/profiling_dependencies_context';
import { RouteBreadcrumbsContextProvider } from './components/contexts/route_breadcrumbs_context';
import { TimeRangeContextProvider } from './components/contexts/time_range_context';
import { RedirectWithDefaultDateRange } from './components/redirect_with_default_date_range';
import { profilingRouter } from './routing';
import { Services } from './services';
import { ProfilingPluginPublicSetupDeps, ProfilingPluginPublicStartDeps } from './types';
import { ProfilingHeaderActionMenu } from './components/profiling_header_action_menu';

interface Props {
  profilingFetchServices: Services;
  coreStart: CoreStart;
  coreSetup: CoreSetup;
  pluginsStart: ProfilingPluginPublicStartDeps;
  pluginsSetup: ProfilingPluginPublicSetupDeps;
  theme$: AppMountParameters['theme$'];
  history: AppMountParameters['history'];
  setHeaderActionMenu: AppMountParameters['setHeaderActionMenu'];
}

const storage = new Storage(localStorage);

function MountProfilingActionMenu({
  theme$,
  setHeaderActionMenu,
}: {
  theme$: AppMountParameters['theme$'];
  setHeaderActionMenu: AppMountParameters['setHeaderActionMenu'];
}) {
  return (
    <HeaderMenuPortal setHeaderActionMenu={setHeaderActionMenu} theme$={theme$}>
      <ProfilingHeaderActionMenu />
    </HeaderMenuPortal>
  );
}

function App({
  coreStart,
  coreSetup,
  pluginsStart,
  pluginsSetup,
  profilingFetchServices,
  theme$,
  history,
  setHeaderActionMenu,
}: Props) {
  const i18nCore = coreStart.i18n;

  const profilingDependencies = useMemo(() => {
    return {
      start: {
        core: coreStart,
        ...pluginsStart,
      },
      setup: {
        core: coreSetup,
        ...pluginsSetup,
      },
      services: profilingFetchServices,
    };
  }, [coreStart, coreSetup, pluginsStart, pluginsSetup, profilingFetchServices]);

  return (
    <KibanaThemeProvider theme$={theme$}>
      <KibanaContextProvider services={{ ...coreStart, ...pluginsStart, storage }}>
        <i18nCore.Context>
          <RedirectAppLinks coreStart={coreStart} currentAppId="profiling">
            <RouterProvider router={profilingRouter as any} history={history}>
              <TimeRangeContextProvider>
                <ProfilingDependenciesContextProvider value={profilingDependencies}>
                  <CheckSetup>
                    <RedirectWithDefaultDateRange>
                      <RouteBreadcrumbsContextProvider>
                        <RouteRenderer />
                      </RouteBreadcrumbsContextProvider>
                    </RedirectWithDefaultDateRange>
                  </CheckSetup>
                  <MountProfilingActionMenu
                    setHeaderActionMenu={setHeaderActionMenu}
                    theme$={theme$}
                  />
                </ProfilingDependenciesContextProvider>
              </TimeRangeContextProvider>
            </RouterProvider>
          </RedirectAppLinks>
        </i18nCore.Context>
      </KibanaContextProvider>
    </KibanaThemeProvider>
  );
}

export const renderApp = (props: Props, element: AppMountParameters['element']) => {
  ReactDOM.render(<App {...props} />, element);

  return () => ReactDOM.unmountComponentAtNode(element);
};
