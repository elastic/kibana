/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import euiDarkVars from '@elastic/eui/dist/eui_theme_dark.json';
import euiLightVars from '@elastic/eui/dist/eui_theme_light.json';
import { EuiErrorBoundary } from '@elastic/eui';
import type { AppMountParameters, CoreStart } from 'kibana/public';
import React from 'react';
import ReactDOM from 'react-dom';
import { Route as ReactRouterRoute } from 'react-router-dom';
import { RouterProvider, createRouter } from '@kbn/typed-react-router-config';
import { DefaultTheme, ThemeProvider } from 'styled-components';
import { i18n } from '@kbn/i18n';
import {
  KibanaContextProvider,
  RedirectAppLinks,
  useUiSetting$,
} from '../../../../../src/plugins/kibana_react/public';
import { APMRouteDefinition } from '../application/routes';
import { ScrollToTopOnPathChange } from '../components/app/Main/ScrollToTopOnPathChange';
import {
  RumHome,
  DASHBOARD_LABEL,
} from '../components/app/RumDashboard/RumHome';
import { ApmPluginContext } from '../context/apm_plugin/apm_plugin_context';
import { UrlParamsProvider } from '../context/url_params_context/url_params_context';
import type { ApmPluginSetupDeps, ApmPluginStartDeps } from '../plugin';
import { createCallApmApi } from '../services/rest/createCallApmApi';
import { createStaticDataView } from '../services/rest/data_view';
import { UXActionMenu } from '../components/app/RumDashboard/ActionMenu';
import { redirectTo } from '../components/routing/redirect_to';
import {
  InspectorContextProvider,
  useBreadcrumbs,
} from '../../../observability/public';
import { APP_WRAPPER_CLASS } from '../../../../../src/core/public';

export const uxRoutes: APMRouteDefinition[] = [
  {
    exact: true,
    path: '/',
    render: redirectTo('/ux'),
    breadcrumb: DASHBOARD_LABEL,
  },
];

function UxApp({ coreStart }: { coreStart: CoreStart }) {
  const [darkMode] = useUiSetting$<boolean>('theme:darkMode');

  const basePath = coreStart.http.basePath.get();

  useBreadcrumbs([
    {
      text: i18n.translate('xpack.apm.ux.breadcrumbs.root', {
        defaultMessage: 'User Experience',
      }),
      href: basePath + '/app/ux',
    },
    {
      text: i18n.translate('xpack.apm.ux.breadcrumbs.dashboard', {
        defaultMessage: 'Dashboard',
      }),
    },
  ]);

  return (
    <ThemeProvider
      theme={(outerTheme?: DefaultTheme) => ({
        ...outerTheme,
        eui: darkMode ? euiDarkVars : euiLightVars,
        darkMode,
      })}
    >
      <div
        className={APP_WRAPPER_CLASS}
        data-test-subj="csmMainContainer"
        role="main"
      >
        <ReactRouterRoute component={ScrollToTopOnPathChange} />
        <RumHome />
      </div>
    </ThemeProvider>
  );
}

const uxRouter = createRouter([]);

export function UXAppRoot({
  appMountParameters,
  coreStart,
  pluginsSetup,
  pluginsStart,
}: {
  appMountParameters: AppMountParameters;
  coreStart: CoreStart;
  pluginsSetup: ApmPluginSetupDeps;
  pluginsStart: ApmPluginStartDeps;
}) {
  const { history } = appMountParameters;
  const i18nCore = coreStart.i18n;
  const { embeddable, data } = pluginsStart;
  const apmPluginContextValue = {
    pluginsSetup,
    pluginsStart,
  };

  return (
    <RedirectAppLinks
      className={APP_WRAPPER_CLASS}
      application={coreStart.application}
    >
      <ApmPluginContext.Provider value={apmPluginContextValue}>
        <KibanaContextProvider
          services={{ ...coreStart, ...pluginsStart, embeddable, data }}
        >
          <i18nCore.Context>
            <RouterProvider history={history} router={uxRouter}>
              <InspectorContextProvider>
                <UrlParamsProvider>
                  <EuiErrorBoundary>
                    <UxApp coreStart={coreStart} />
                  </EuiErrorBoundary>
                  <UXActionMenu appMountParameters={appMountParameters} />
                </UrlParamsProvider>
              </InspectorContextProvider>
            </RouterProvider>
          </i18nCore.Context>
        </KibanaContextProvider>
      </ApmPluginContext.Provider>
    </RedirectAppLinks>
  );
}

/**
 * This module is rendered asynchronously in the Kibana platform.
 */

export const renderApp = ({
  appMountParameters,
  coreStart,
  pluginsSetup,
  pluginsStart,
}: {
  appMountParameters: AppMountParameters;
  coreStart: CoreStart;
  pluginsSetup: ApmPluginSetupDeps;
  pluginsStart: ApmPluginStartDeps;
}) => {
  const { element } = appMountParameters;

  createCallApmApi(coreStart);

  // Automatically creates static data view and stores as saved object
  createStaticDataView().catch((e) => {
    // eslint-disable-next-line no-console
    console.log('Error creating static data view', e);
  });

  ReactDOM.render(
    <UXAppRoot
      appMountParameters={appMountParameters}
      coreStart={coreStart}
      pluginsSetup={pluginsSetup}
      pluginsStart={pluginsStart}
    />,
    element
  );
  return () => {
    ReactDOM.unmountComponentAtNode(element);
  };
};
