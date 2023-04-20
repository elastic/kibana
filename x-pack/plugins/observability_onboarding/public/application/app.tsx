/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiErrorBoundary } from '@elastic/eui';
import { Theme, ThemeProvider } from '@emotion/react';
import {
  APP_WRAPPER_CLASS,
  AppMountParameters,
  CoreStart,
} from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import {
  KibanaContextProvider,
  KibanaThemeProvider,
  RedirectAppLinks,
  useKibana,
  useUiSetting$,
} from '@kbn/kibana-react-plugin/public';
import { useBreadcrumbs } from '@kbn/observability-plugin/public';
import { RouterProvider, createRouter } from '@kbn/typed-react-router-config';
import { euiDarkVars, euiLightVars } from '@kbn/ui-theme';
import React from 'react';
import ReactDOM from 'react-dom';
import { Redirect, RouteComponentProps, RouteProps } from 'react-router-dom';
import { Home } from '../components/app/home';
import {
  ObservabilityOnboardingPluginSetupDeps,
  ObservabilityOnboardingPluginStartDeps,
} from '../plugin';

export type BreadcrumbTitle<
  T extends { [K in keyof T]?: string | undefined } = {}
> = string | ((props: RouteComponentProps<T>) => string) | null;

export interface RouteDefinition<
  T extends { [K in keyof T]?: string | undefined } = any
> extends RouteProps {
  breadcrumb: BreadcrumbTitle<T>;
}

export const onBoardingTitle = i18n.translate(
  'xpack.observability_onboarding.breadcrumbs.onboarding',
  {
    defaultMessage: 'Onboarding',
  }
);

export const onboardingRoutes: RouteDefinition[] = [
  {
    exact: true,
    path: '/',
    render: () => <Redirect to="/observabilityOnboarding" />,
    breadcrumb: onBoardingTitle,
  },
];

function ObservabilityOnboardingApp() {
  const [darkMode] = useUiSetting$<boolean>('theme:darkMode');

  const { http } = useKibana<ObservabilityOnboardingPluginStartDeps>().services;
  const basePath = http.basePath.get();

  useBreadcrumbs([
    {
      text: onBoardingTitle,
      href: basePath + '/app/observabilityOnboarding',
    },
    {
      text: i18n.translate('xpack.observability_onboarding.breadcrumbs.logs', {
        defaultMessage: 'Logs',
      }),
    },
  ]);

  return (
    <ThemeProvider
      theme={(outerTheme?: Theme) => ({
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

export const observabilityOnboardingRouter = createRouter({});

export function ObservabilityOnboardingAppRoot({
  appMountParameters,
  core,
  deps,
  corePlugins: { observability, data },
}: {
  appMountParameters: AppMountParameters;
  core: CoreStart;
  deps: ObservabilityOnboardingPluginSetupDeps;
  corePlugins: ObservabilityOnboardingPluginStartDeps;
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
            <RouterProvider
              history={history}
              router={observabilityOnboardingRouter}
            >
              <EuiErrorBoundary>
                <ObservabilityOnboardingApp />
              </EuiErrorBoundary>
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
  deps: ObservabilityOnboardingPluginSetupDeps;
  appMountParameters: AppMountParameters;
  corePlugins: ObservabilityOnboardingPluginStartDeps;
}) => {
  const { element } = appMountParameters;

  ReactDOM.render(
    <ObservabilityOnboardingAppRoot
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
