/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiErrorBoundary } from '@elastic/eui';
import { Theme, ThemeProvider } from '@emotion/react';
import { AppMountParameters, APP_WRAPPER_CLASS, CoreStart } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import { KibanaContextProvider, useDarkMode } from '@kbn/kibana-react-plugin/public';
import { KibanaRenderContextProvider } from '@kbn/react-kibana-context-render';
import { KibanaThemeProvider } from '@kbn/react-kibana-context-theme';
import { RedirectAppLinks } from '@kbn/shared-ux-link-redirect-app';
import { HeaderMenuPortal } from '@kbn/observability-shared-plugin/public';
import { Router, Routes, Route } from '@kbn/shared-ux-router';
import { euiDarkVars, euiLightVars } from '@kbn/ui-theme';
import React from 'react';
import ReactDOM from 'react-dom';
import { OBSERVABILITY_ONBOARDING_TELEMETRY_EVENT } from '../../common/telemetry_events';
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
import { ExperimentalOnboardingFlow } from './experimental_onboarding_flow';
import { ExperimentalOnboardingFeatureFlag } from '../context/experimental_onboarding_enabled';

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

          return <Route key={path} path={path} exact={exact} component={Wrapper} />;
        })}
        <Route exact path={customLogRoutesPaths}>
          <CustomLogs>
            {customLogRoutesPaths.map((key) => {
              const path = key as keyof typeof routes;
              const { handler, exact } = routes[path];
              const Wrapper = () => {
                return handler();
              };

              return <Route key={path} path={path} exact={exact} component={Wrapper} />;
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

              return <Route key={path} path={path} exact={exact} component={Wrapper} />;
            })}
          </SystemLogs>
        </Route>
      </Routes>
    </>
  );
}

function ObservabilityOnboardingApp() {
  const darkMode = useDarkMode(false);
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
  experimentalOnboardingFlowEnabled,
  corePlugins: { observability, data },
  config,
}: {
  appMountParameters: AppMountParameters;
} & RenderAppProps) {
  const { history, setHeaderActionMenu } = appMountParameters;
  const plugins = { ...deps };

  const renderFeedbackLinkAsPortal = !config.serverless.enabled;

  core.analytics.reportEvent(OBSERVABILITY_ONBOARDING_TELEMETRY_EVENT.eventType, {
    uses_legacy_onboarding_page: !experimentalOnboardingFlowEnabled,
  });

  return (
    <KibanaRenderContextProvider {...core}>
      <div className={APP_WRAPPER_CLASS}>
        <RedirectAppLinks
          coreStart={{
            application: core.application,
          }}
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
              theme={core.theme}
              modify={{
                breakpoint: {
                  xxl: 1600,
                  xxxl: 2000,
                },
              }}
            >
              <Router history={history}>
                <EuiErrorBoundary>
                  {renderFeedbackLinkAsPortal && (
                    <HeaderMenuPortal
                      setHeaderActionMenu={setHeaderActionMenu}
                      startServices={core}
                    >
                      <ObservabilityOnboardingHeaderActionMenu />
                    </HeaderMenuPortal>
                  )}
                  <ExperimentalOnboardingFeatureFlag.Provider
                    value={experimentalOnboardingFlowEnabled}
                  >
                    {experimentalOnboardingFlowEnabled ? (
                      <ExperimentalOnboardingFlow />
                    ) : (
                      <ObservabilityOnboardingApp />
                    )}
                  </ExperimentalOnboardingFeatureFlag.Provider>
                </EuiErrorBoundary>
              </Router>
            </KibanaThemeProvider>
          </KibanaContextProvider>
        </RedirectAppLinks>
      </div>
    </KibanaRenderContextProvider>
  );
}

/**
 * This module is rendered asynchronously in the Kibana platform.
 */

interface RenderAppProps {
  core: CoreStart;
  deps: ObservabilityOnboardingPluginSetupDeps;
  appMountParameters: AppMountParameters;
  experimentalOnboardingFlowEnabled: boolean;
  corePlugins: ObservabilityOnboardingPluginStartDeps;
  config: ConfigSchema;
}

export const renderApp = (props: RenderAppProps) => {
  const { element } = props.appMountParameters;

  ReactDOM.render(<ObservabilityOnboardingAppRoot {...props} />, element);
  return () => {
    props.corePlugins.data.search.session.clear();
    ReactDOM.unmountComponentAtNode(element);
  };
};
