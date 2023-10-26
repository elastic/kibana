/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiErrorBoundary } from '@elastic/eui';
import { Theme, ThemeProvider } from '@emotion/react';
import {
  AppMountParameters,
  APP_WRAPPER_CLASS,
  CoreStart,
} from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import {
  KibanaContextProvider,
  KibanaThemeProvider,
  RedirectAppLinks,
  useUiSetting$,
} from '@kbn/kibana-react-plugin/public';
import { HeaderMenuPortal } from '@kbn/observability-shared-plugin/public';
import { Router, Routes, Route } from '@kbn/shared-ux-router';
import { euiDarkVars, euiLightVars } from '@kbn/ui-theme';
import React from 'react';
import ReactDOM from 'react-dom';
import { ConfigSchema } from '..';
import { customLogsRoutes } from '../components/app/custom_logs';
import { systemLogsRoutes } from '../components/app/system_logs';
import { ObservabilityOnboardingHeaderActionMenu } from '../components/app/header_action_menu';
import {
  ObservabilityOnboardingPluginSetupDeps,
  ObservabilityOnboardingPluginStartDeps,
} from '../plugin';
import { baseRoutes, routes } from '../routes';
import { CustomLogs } from '../routes/templates/custom_logs';
import { SystemLogs } from '../routes/templates/system_logs';

export const onBoardingTitle = i18n.translate(
  'xpack.observability_onboarding.breadcrumbs.onboarding',
  {
    defaultMessage: 'Onboarding',
  }
);

export const breadcrumbsApp = {
  id: 'observabilityOnboarding',
  label: onBoardingTitle,
};

function App() {
  const customLogRoutesPaths = Object.keys(customLogsRoutes);
  const systemLogRoutesPaths = Object.keys(systemLogsRoutes);

  return (
    <>
      <Routes>
        {Object.keys(baseRoutes).map((key) => {
          const path = key as keyof typeof routes;
          const { handler, exact } = routes[path];
          const Wrapper = () => {
            return handler();
          };

          return (
            <Route key={path} path={path} exact={exact} component={Wrapper} />
          );
        })}
        <Route exact path={customLogRoutesPaths}>
          <CustomLogs>
            {customLogRoutesPaths.map((key) => {
              const path = key as keyof typeof routes;
              const { handler, exact } = routes[path];
              const Wrapper = () => {
                return handler();
              };

              return (
                <Route
                  key={path}
                  path={path}
                  exact={exact}
                  component={Wrapper}
                />
              );
            })}
          </CustomLogs>
        </Route>
        <Route exact path={systemLogRoutesPaths}>
          <SystemLogs>
            {systemLogRoutesPaths.map((key) => {
              const path = key as keyof typeof routes;
              const { handler, exact } = routes[path];
              const Wrapper = () => {
                return handler();
              };

              return (
                <Route
                  key={path}
                  path={path}
                  exact={exact}
                  component={Wrapper}
                />
              );
            })}
          </SystemLogs>
        </Route>
      </Routes>
    </>
  );
}

function ObservabilityOnboardingApp() {
  const [darkMode] = useUiSetting$<boolean>('theme:darkMode');

  return (
    <ThemeProvider
      theme={(outerTheme?: Theme) => ({
        ...outerTheme,
        eui: darkMode ? euiDarkVars : euiLightVars,
        darkMode,
      })}
    >
      <div className={APP_WRAPPER_CLASS} data-test-subj="csmMainContainer">
        <App />
      </div>
    </ThemeProvider>
  );
}

export function ObservabilityOnboardingAppRoot({
  appMountParameters,
  core,
  deps,
  corePlugins: { observability, data },
  config,
}: {
  appMountParameters: AppMountParameters;
  core: CoreStart;
  deps: ObservabilityOnboardingPluginSetupDeps;
  corePlugins: ObservabilityOnboardingPluginStartDeps;
  config: ConfigSchema;
}) {
  const { history, setHeaderActionMenu, theme$ } = appMountParameters;
  const i18nCore = core.i18n;
  const plugins = { ...deps };

  const renderFeedbackLinkAsPortal = !config.serverless.enabled;

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
          config,
        }}
      >
        <KibanaThemeProvider
          theme$={theme$}
          modify={{
            breakpoint: {
              xxl: 1600,
              xxxl: 2000,
            },
          }}
        >
          <i18nCore.Context>
            <Router history={history}>
              <EuiErrorBoundary>
                {renderFeedbackLinkAsPortal && (
                  <HeaderMenuPortal
                    setHeaderActionMenu={setHeaderActionMenu}
                    theme$={theme$}
                  >
                    <ObservabilityOnboardingHeaderActionMenu />
                  </HeaderMenuPortal>
                )}
                <ObservabilityOnboardingApp />
              </EuiErrorBoundary>
            </Router>
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
  config,
}: {
  core: CoreStart;
  deps: ObservabilityOnboardingPluginSetupDeps;
  appMountParameters: AppMountParameters;
  corePlugins: ObservabilityOnboardingPluginStartDeps;
  config: ConfigSchema;
}) => {
  const { element } = appMountParameters;

  ReactDOM.render(
    <ObservabilityOnboardingAppRoot
      appMountParameters={appMountParameters}
      core={core}
      deps={deps}
      corePlugins={corePlugins}
      config={config}
    />,
    element
  );
  return () => {
    corePlugins.data.search.session.clear();
    ReactDOM.unmountComponentAtNode(element);
  };
};
