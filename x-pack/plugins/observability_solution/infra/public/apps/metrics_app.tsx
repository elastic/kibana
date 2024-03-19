/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { History } from 'history';
import { CoreStart } from '@kbn/core/public';
import React from 'react';
import ReactDOM from 'react-dom';
import { Router, Routes, Route } from '@kbn/shared-ux-router';
import { AppMountParameters } from '@kbn/core/public';
import { Storage } from '@kbn/kibana-utils-plugin/public';
import { InfraPublicConfig } from '../../common/plugin_config_types';
import { LinkToMetricsPage } from '../pages/link_to/link_to_metrics';
import { InfrastructurePage } from '../pages/metrics';
import { InfraClientStartDeps, InfraClientStartExports } from '../types';
import { CommonInfraProviders, CoreProviders } from './common_providers';
import { prepareMountElement } from './common_styles';
import { SourceProvider } from '../containers/metrics_source';
import { PluginConfigProvider } from '../containers/plugin_config_context';
import type { KibanaEnvContext } from '../hooks/use_kibana';

export const METRICS_APP_DATA_TEST_SUBJ = 'infraMetricsPage';

export const renderApp = (
  core: CoreStart,
  plugins: InfraClientStartDeps,
  pluginStart: InfraClientStartExports,
  pluginConfig: InfraPublicConfig,
  { element, history, setHeaderActionMenu, theme$ }: AppMountParameters,
  kibanaEnvironment: KibanaEnvContext
) => {
  const storage = new Storage(window.localStorage);

  prepareMountElement(element, METRICS_APP_DATA_TEST_SUBJ);

  ReactDOM.render(
    <MetricsApp
      core={core}
      history={history}
      plugins={plugins}
      pluginStart={pluginStart}
      pluginConfig={pluginConfig}
      setHeaderActionMenu={setHeaderActionMenu}
      storage={storage}
      theme$={theme$}
      kibanaEnvironment={kibanaEnvironment}
    />,
    element
  );

  return () => {
    plugins.data.search.session.clear();
    core.chrome.docTitle.reset();
    ReactDOM.unmountComponentAtNode(element);
  };
};

const MetricsApp: React.FC<{
  core: CoreStart;
  history: History<unknown>;
  pluginStart: InfraClientStartExports;
  pluginConfig: InfraPublicConfig;
  plugins: InfraClientStartDeps;
  setHeaderActionMenu: AppMountParameters['setHeaderActionMenu'];
  storage: Storage;
  theme$: AppMountParameters['theme$'];
  kibanaEnvironment: KibanaEnvContext;
}> = ({
  core,
  history,
  pluginStart,
  pluginConfig,
  plugins,
  setHeaderActionMenu,
  storage,
  theme$,
  kibanaEnvironment,
}) => {
  const uiCapabilities = core.application.capabilities;

  return (
    <CoreProviders
      core={core}
      pluginStart={pluginStart}
      plugins={plugins}
      theme$={theme$}
      kibanaEnvironment={kibanaEnvironment}
    >
      <CommonInfraProviders
        appName="Metrics UI"
        setHeaderActionMenu={setHeaderActionMenu}
        storage={storage}
        theme$={theme$}
        triggersActionsUI={plugins.triggersActionsUi}
        observabilityAIAssistant={plugins.observabilityAIAssistant}
      >
        <SourceProvider sourceId="default">
          <PluginConfigProvider value={pluginConfig}>
            <Router history={history}>
              <Routes>
                <Route path="/link-to" component={LinkToMetricsPage} />
                {uiCapabilities?.infrastructure?.show && (
                  <Route path="/" component={InfrastructurePage} />
                )}
              </Routes>
            </Router>
          </PluginConfigProvider>
        </SourceProvider>
      </CommonInfraProviders>
    </CoreProviders>
  );
};
