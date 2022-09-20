/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { euiLightVars, euiDarkVars } from '@kbn/ui-theme';
import { EuiErrorBoundary } from '@elastic/eui';
import React from 'react';
import ReactDOM from 'react-dom';
import { Redirect } from 'react-router-dom';
import { DefaultTheme, ThemeProvider } from 'styled-components';
import { RouterProvider, createRouter } from '@kbn/typed-react-router-config';
import { i18n } from '@kbn/i18n';
import { RouteComponentProps, RouteProps } from 'react-router-dom';
import {
  AppMountParameters,
  CoreStart,
  APP_WRAPPER_CLASS,
} from '@kbn/core/public';

import {
  KibanaContextProvider,
  KibanaThemeProvider,
  RedirectAppLinks,
  useUiSetting$,
} from '@kbn/kibana-react-plugin/public';

import {
  DatePickerContextProvider,
  InspectorContextProvider,
  useBreadcrumbs,
} from '@kbn/observability-plugin/public';
import { CsmSharedContextProvider } from '../components/app/rum_dashboard/csm_shared_context';
import {
  DASHBOARD_LABEL,
  RumHome,
} from '../components/app/rum_dashboard/rum_home';
import { ApmPluginSetupDeps, ApmPluginStartDeps } from '../plugin';
import { UXActionMenu } from '../components/app/rum_dashboard/action_menu';

import { UrlParamsProvider } from '../context/url_params_context/url_params_context';
import { createStaticDataView } from '../services/rest/data_view';
import { createCallApmApi } from '../services/rest/create_call_apm_api';
import { useKibanaServices } from '../hooks/use_kibana_services';

export type BreadcrumbTitle<T = {}> =
  | string
  | ((props: RouteComponentProps<T>) => string)
  | null;

export interface RouteDefinition<T = any> extends RouteProps {
  breadcrumb: BreadcrumbTitle<T>;
}

export const uxRoutes: RouteDefinition[] = [
  {
    exact: true,
    path: '/',
    render: () => <Redirect to="/ux" />,
    breadcrumb: DASHBOARD_LABEL,
  },
];

function UxApp() {
  const [darkMode] = useUiSetting$<boolean>('theme:darkMode');

  const { http } = useKibanaServices();
  const basePath = http.basePath.get();

  useBreadcrumbs([
    {
      text: i18n.translate('xpack.ux.breadcrumbs.root', {
        defaultMessage: 'User Experience',
      }),
      href: basePath + '/app/ux',
    },
    {
      text: i18n.translate('xpack.ux.breadcrumbs.dashboard', {
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
      <div className={APP_WRAPPER_CLASS} data-test-subj="csmMainContainer">
        <RumHome />
      </div>
    </ThemeProvider>
  );
}

export const uxRouter = createRouter({});

export function UXAppRoot({
  appMountParameters,
  core,
  deps,
  corePlugins: {
    embeddable,
    inspector,
    maps,
    observability,
    data,
    dataViews,
    lens,
  },
}: {
  appMountParameters: AppMountParameters;
  core: CoreStart;
  deps: ApmPluginSetupDeps;
  corePlugins: ApmPluginStartDeps;
}) {
  const { history } = appMountParameters;
  const i18nCore = core.i18n;
  const plugins = { ...deps, maps };

  createCallApmApi(core);

  return (
    <RedirectAppLinks
      className={APP_WRAPPER_CLASS}
      application={core.application}
    >
      <KibanaContextProvider
        services={{
          ...core,
          ...plugins,
          inspector,
          observability,
          embeddable,
          data,
          dataViews,
          lens,
        }}
      >
        <KibanaThemeProvider
          theme$={appMountParameters.theme$}
          modify={{
            breakpoint: {
              xxl: 1600,
              xxxl: 2000,
            },
          }}
        >
          <i18nCore.Context>
            <RouterProvider history={history} router={uxRouter}>
              <DatePickerContextProvider>
                <InspectorContextProvider>
                  <UrlParamsProvider>
                    <EuiErrorBoundary>
                      <CsmSharedContextProvider>
                        <UxApp />
                      </CsmSharedContextProvider>
                    </EuiErrorBoundary>
                    <UXActionMenu appMountParameters={appMountParameters} />
                  </UrlParamsProvider>
                </InspectorContextProvider>
              </DatePickerContextProvider>
            </RouterProvider>
          </i18nCore.Context>
        </KibanaThemeProvider>
      </KibanaContextProvider>
    </RedirectAppLinks>
  );
}

/**
 * This module is rendered asynchronously in the Kibana platform.
 */

export const renderApp = ({
  core,
  deps,
  appMountParameters,
  corePlugins,
}: {
  core: CoreStart;
  deps: ApmPluginSetupDeps;
  appMountParameters: AppMountParameters;
  corePlugins: ApmPluginStartDeps;
}) => {
  const { element } = appMountParameters;

  createCallApmApi(core);

  // Automatically creates static data view and stores as saved object
  createStaticDataView().catch((e) => {
    // eslint-disable-next-line no-console
    console.log('Error creating static data view', e);
  });

  ReactDOM.render(
    <UXAppRoot
      appMountParameters={appMountParameters}
      core={core}
      deps={deps}
      corePlugins={corePlugins}
    />,
    element
  );
  return () => {
    ReactDOM.unmountComponentAtNode(element);
  };
};
