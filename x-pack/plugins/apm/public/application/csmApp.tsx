/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import euiDarkVars from '@elastic/eui/dist/eui_theme_dark.json';
import euiLightVars from '@elastic/eui/dist/eui_theme_light.json';
import { AppMountParameters, CoreStart } from 'kibana/public';
import React from 'react';
import ReactDOM from 'react-dom';
import { Route, Router } from 'react-router-dom';
import { DefaultTheme, ThemeProvider } from 'styled-components';
import { euiStyled } from '../../../../../src/plugins/kibana_react/common';
import {
  KibanaContextProvider,
  RedirectAppLinks,
  useUiSetting$,
} from '../../../../../src/plugins/kibana_react/public';
import { APMRouteDefinition } from '../application/routes';
import { renderAsRedirectTo } from '../components/app/Main/route_config';
import { ScrollToTopOnPathChange } from '../components/app/Main/ScrollToTopOnPathChange';
import { RumHome, UX_LABEL } from '../components/app/RumDashboard/RumHome';
import { ApmPluginContext } from '../context/apm_plugin/apm_plugin_context';
import { UrlParamsProvider } from '../context/url_params_context/url_params_context';
import { useBreadcrumbs } from '../hooks/use_breadcrumbs';
import { ConfigSchema } from '../index';
import {
  ApmPluginSetupDeps,
  ApmPluginStartDeps,
  ApmRuleRegistry,
} from '../plugin';
import { createCallApmApi } from '../services/rest/createCallApmApi';
import { px, units } from '../style/variables';
import { createStaticIndexPattern } from '../services/rest/index_pattern';
import { UXActionMenu } from '../components/app/RumDashboard/ActionMenu';

const CsmMainContainer = euiStyled.div`
  padding: ${px(units.plus)};
  height: 100%;
`;

export const rumRoutes: APMRouteDefinition[] = [
  {
    exact: true,
    path: '/',
    render: renderAsRedirectTo('/ux'),
    breadcrumb: UX_LABEL,
  },
];

function CsmApp() {
  const [darkMode] = useUiSetting$<boolean>('theme:darkMode');

  useBreadcrumbs(rumRoutes);

  return (
    <ThemeProvider
      theme={(outerTheme?: DefaultTheme) => ({
        ...outerTheme,
        eui: darkMode ? euiDarkVars : euiLightVars,
        darkMode,
      })}
    >
      <CsmMainContainer data-test-subj="csmMainContainer" role="main">
        <Route component={ScrollToTopOnPathChange} />
        <RumHome />
      </CsmMainContainer>
    </ThemeProvider>
  );
}

export function CsmAppRoot({
  appMountParameters,
  core,
  deps,
  config,
  corePlugins: { embeddable, maps },
  apmRuleRegistry,
}: {
  appMountParameters: AppMountParameters;
  core: CoreStart;
  deps: ApmPluginSetupDeps;
  config: ConfigSchema;
  corePlugins: ApmPluginStartDeps;
  apmRuleRegistry: ApmRuleRegistry;
}) {
  const { history } = appMountParameters;
  const i18nCore = core.i18n;
  const plugins = { ...deps, maps };
  const apmPluginContextValue = {
    appMountParameters,
    config,
    core,
    plugins,
    apmRuleRegistry,
  };

  return (
    <RedirectAppLinks application={core.application}>
      <ApmPluginContext.Provider value={apmPluginContextValue}>
        <KibanaContextProvider services={{ ...core, ...plugins, embeddable }}>
          <i18nCore.Context>
            <Router history={history}>
              <UrlParamsProvider>
                <CsmApp />
                <UXActionMenu appMountParameters={appMountParameters} />
              </UrlParamsProvider>
            </Router>
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
  apmRuleRegistry,
}: {
  core: CoreStart;
  deps: ApmPluginSetupDeps;
  appMountParameters: AppMountParameters;
  config: ConfigSchema;
  corePlugins: ApmPluginStartDeps;
  apmRuleRegistry: ApmRuleRegistry;
}) => {
  const { element } = appMountParameters;

  createCallApmApi(core);

  // Automatically creates static index pattern and stores as saved object
  createStaticIndexPattern().catch((e) => {
    // eslint-disable-next-line no-console
    console.log('Error creating static index pattern', e);
  });

  ReactDOM.render(
    <CsmAppRoot
      appMountParameters={appMountParameters}
      core={core}
      deps={deps}
      config={config}
      corePlugins={corePlugins}
      apmRuleRegistry={apmRuleRegistry}
    />,
    element
  );
  return () => {
    ReactDOM.unmountComponentAtNode(element);
  };
};
