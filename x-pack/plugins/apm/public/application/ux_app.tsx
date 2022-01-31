/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { euiLightVars, euiDarkVars } from '@kbn/ui-theme';
import { EuiErrorBoundary } from '@elastic/eui';
import { AppMountParameters, CoreStart } from 'kibana/public';
import React from 'react';
import ReactDOM from 'react-dom';
import { Route as ReactRouterRoute } from 'react-router-dom';
import { RouterProvider, createRouter } from '@kbn/typed-react-router-config';
import { DefaultTheme, ThemeProvider } from 'styled-components';
import { i18n } from '@kbn/i18n';
import type { ObservabilityRuleTypeRegistry } from '../../../observability/public';
import {
  KibanaContextProvider,
  RedirectAppLinks,
  useUiSetting$,
} from '../../../../../src/plugins/kibana_react/public';
import { APMRouteDefinition } from '../application/routes';
import { ScrollToTopOnPathChange } from '../components/app/main/scroll_to_top_on_path_change';
import {
  RumHome,
  DASHBOARD_LABEL,
} from '../components/app/rum_dashboard/rum_home';
import { ApmPluginContext } from '../context/apm_plugin/apm_plugin_context';
import { UrlParamsProvider } from '../context/url_params_context/url_params_context';
import { ConfigSchema } from '../index';
import { ApmPluginSetupDeps, ApmPluginStartDeps } from '../plugin';
import { createCallApmApi } from '../services/rest/create_call_apm_api';
import { createStaticDataView } from '../services/rest/data_view';
import { UXActionMenu } from '../components/app/rum_dashboard/action_menu';
import { redirectTo } from '../components/routing/redirect_to';
import {
  InspectorContextProvider,
  useBreadcrumbs,
} from '../../../observability/public';
import { useApmPluginContext } from '../context/apm_plugin/use_apm_plugin_context';
import { APP_WRAPPER_CLASS } from '../../../../../src/core/public';
import { KibanaThemeProvider } from '../../../../../src/plugins/kibana_react/public';

export const uxRoutes: APMRouteDefinition[] = [
  {
    exact: true,
    path: '/',
    render: redirectTo('/ux'),
    breadcrumb: DASHBOARD_LABEL,
  },
];

function UxApp() {
  const [darkMode] = useUiSetting$<boolean>('theme:darkMode');

  const { core } = useApmPluginContext();
  const basePath = core.http.basePath.get();

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

const uxRouter = createRouter({});

export function UXAppRoot({
  appMountParameters,
  core,
  deps,
  config,
  corePlugins: { embeddable, inspector, maps, observability, data },
  observabilityRuleTypeRegistry,
}: {
  appMountParameters: AppMountParameters;
  core: CoreStart;
  deps: ApmPluginSetupDeps;
  config: ConfigSchema;
  corePlugins: ApmPluginStartDeps;
  observabilityRuleTypeRegistry: ObservabilityRuleTypeRegistry;
}) {
  const { history } = appMountParameters;
  const i18nCore = core.i18n;
  const plugins = { ...deps, maps };
  const apmPluginContextValue = {
    appMountParameters,
    config,
    core,
    inspector,
    plugins,
    observability,
    observabilityRuleTypeRegistry,
  };

  return (
    <RedirectAppLinks
      className={APP_WRAPPER_CLASS}
      application={core.application}
    >
      <ApmPluginContext.Provider value={apmPluginContextValue}>
        <KibanaContextProvider
          services={{ ...core, ...plugins, embeddable, data }}
        >
          <i18nCore.Context>
            <RouterProvider history={history} router={uxRouter}>
              <InspectorContextProvider>
                <UrlParamsProvider>
                  <EuiErrorBoundary>
                    <UxApp />
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
  core,
  deps,
  appMountParameters,
  config,
  corePlugins,
  observabilityRuleTypeRegistry,
}: {
  core: CoreStart;
  deps: ApmPluginSetupDeps;
  appMountParameters: AppMountParameters;
  config: ConfigSchema;
  corePlugins: ApmPluginStartDeps;
  observabilityRuleTypeRegistry: ObservabilityRuleTypeRegistry;
}) => {
  const { element, theme$ } = appMountParameters;

  createCallApmApi(core);

  // Automatically creates static data view and stores as saved object
  createStaticDataView().catch((e) => {
    // eslint-disable-next-line no-console
    console.log('Error creating static data view', e);
  });

  ReactDOM.render(
    <KibanaThemeProvider theme$={theme$}>
      <UXAppRoot
        appMountParameters={appMountParameters}
        core={core}
        deps={deps}
        config={config}
        corePlugins={corePlugins}
        observabilityRuleTypeRegistry={observabilityRuleTypeRegistry}
      />
    </KibanaThemeProvider>,
    element
  );
  return () => {
    ReactDOM.unmountComponentAtNode(element);
  };
};
