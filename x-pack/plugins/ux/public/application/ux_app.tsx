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
} from '../../../../../src/core/public';

import {
  KibanaContextProvider,
  RedirectAppLinks,
  useUiSetting$,
} from '../../../../../src/plugins/kibana_react/public';

import {
  DASHBOARD_LABEL,
  RumHome,
} from '../components/app/rum_dashboard/rum_home';
import { ApmPluginSetupDeps, ApmPluginStartDeps } from '../plugin';
import { UXActionMenu } from '../components/app/rum_dashboard/action_menu';

import {
  DatePickerContextProvider,
  InspectorContextProvider,
  useBreadcrumbs,
} from '../../../observability/public';
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
      <div
        className={APP_WRAPPER_CLASS}
        data-test-subj="csmMainContainer"
        role="main"
      >
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
  corePlugins: { embeddable, inspector, maps, observability, data },
}: {
  appMountParameters: AppMountParameters;
  core: CoreStart;
  deps: ApmPluginSetupDeps;
  corePlugins: ApmPluginStartDeps;
}) {
  const { history } = appMountParameters;
  const i18nCore = core.i18n;
  const plugins = { ...deps, maps };

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
        }}
      >
        <i18nCore.Context>
          <RouterProvider history={history} router={uxRouter}>
            <DatePickerContextProvider>
              <InspectorContextProvider>
                <UrlParamsProvider>
                  <EuiErrorBoundary>
                    <UxApp />
                  </EuiErrorBoundary>
                  <UXActionMenu appMountParameters={appMountParameters} />
                </UrlParamsProvider>
              </InspectorContextProvider>
            </DatePickerContextProvider>
          </RouterProvider>
        </i18nCore.Context>
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
