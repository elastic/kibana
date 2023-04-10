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
import { useKibana } from '@kbn/kibana-react-plugin/public';
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
import { ApmPluginSetupDeps, ApmPluginStartDeps } from '../plugin';
import { Home } from '../components/app/home';

export type BreadcrumbTitle<T = {}> =
  | string
  | ((props: RouteComponentProps<T>) => string)
  | null;

export interface RouteDefinition<T = any> extends RouteProps {
  breadcrumb: BreadcrumbTitle<T>;
}

export const onboardingSetupRoutes: RouteDefinition[] = [
  {
    exact: true,
    path: '/',
    render: () => <Redirect to="/onboardingSetup" />,
    breadcrumb: 'FoooOOobar',
  },
];

function ObservabilitySetupApp() {
  const [darkMode] = useUiSetting$<boolean>('theme:darkMode');

  const { http } = useKibana<ApmPluginStartDeps>().services;
  const basePath = http.basePath.get();

  useBreadcrumbs([
    {
      text: i18n.translate('xpack.onboardingSetup.breadcrumbs.onboarding', {
        defaultMessage: 'Onboarding',
      }),
      href: basePath + '/app/onboardingSetup',
    },
    {
      text: i18n.translate('xpack.onboardingSetup.breadcrumbs.logs', {
        defaultMessage: 'Logs',
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
        <Home />
      </div>
    </ThemeProvider>
  );
}

export const observabilitySetupRouter = createRouter({});

export function ObservabilitySetupAppRoot({
  appMountParameters,
  core,
  deps,
  corePlugins: { observability, data },
}: {
  appMountParameters: AppMountParameters;
  core: CoreStart;
  deps: ApmPluginSetupDeps;
  corePlugins: ApmPluginStartDeps;
}) {
  const { history } = appMountParameters;
  const i18nCore = core.i18n;
  const plugins = { ...deps };

  return (
    <RedirectAppLinks
      className={APP_WRAPPER_CLASS}
      application={core.application}
    >
      <KibanaContextProvider
        services={{
          ...core,
          ...plugins,
          observability,
          data,
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
            <RouterProvider history={history} router={observabilitySetupRouter}>
              <DatePickerContextProvider>
                <InspectorContextProvider>
                  <EuiErrorBoundary>
                    <ObservabilitySetupApp />
                  </EuiErrorBoundary>
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

  ReactDOM.render(
    <ObservabilitySetupAppRoot
      appMountParameters={appMountParameters}
      core={core}
      deps={deps}
      corePlugins={corePlugins}
    />,
    element
  );
  return () => {
    corePlugins.data.search.session.clear();
    ReactDOM.unmountComponentAtNode(element);
  };
};
