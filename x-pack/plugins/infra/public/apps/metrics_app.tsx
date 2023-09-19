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
import '../index.scss';
import { LinkToMetricsPage } from '../pages/link_to/link_to_metrics';
import { InfrastructurePage } from '../pages/metrics';
import { InfraClientStartDeps, InfraClientStartExports } from '../types';
import { RedirectWithQueryParams } from '../utils/redirect_with_query_params';
import { CommonInfraProviders, CoreProviders } from './common_providers';
import { prepareMountElement } from './common_styles';
import { SourceProvider } from '../containers/metrics_source';

export const METRICS_APP_DATA_TEST_SUBJ = 'infraMetricsPage';

export const renderApp = (
  core: CoreStart,
  plugins: InfraClientStartDeps,
  pluginStart: InfraClientStartExports,
  { element, history, setHeaderActionMenu, theme$ }: AppMountParameters
) => {
  const storage = new Storage(window.localStorage);

  prepareMountElement(element, METRICS_APP_DATA_TEST_SUBJ);

  ReactDOM.render(
    <MetricsApp
      core={core}
      history={history}
      plugins={plugins}
      pluginStart={pluginStart}
      setHeaderActionMenu={setHeaderActionMenu}
      storage={storage}
      theme$={theme$}
    />,
    element
  );

  return () => {
    core.chrome.docTitle.reset();
    ReactDOM.unmountComponentAtNode(element);
  };
};

const MetricsApp: React.FC<{
  core: CoreStart;
  history: History<unknown>;
  pluginStart: InfraClientStartExports;
  plugins: InfraClientStartDeps;
  setHeaderActionMenu: AppMountParameters['setHeaderActionMenu'];
  storage: Storage;
  theme$: AppMountParameters['theme$'];
}> = ({ core, history, pluginStart, plugins, setHeaderActionMenu, storage, theme$ }) => {
  const uiCapabilities = core.application.capabilities;

  return (
    <CoreProviders core={core} pluginStart={pluginStart} plugins={plugins} theme$={theme$}>
      <CommonInfraProviders
        appName="Metrics UI"
        setHeaderActionMenu={setHeaderActionMenu}
        storage={storage}
        theme$={theme$}
        triggersActionsUI={plugins.triggersActionsUi}
        observabilityAIAssistant={plugins.observabilityAIAssistant}
      >
        <SourceProvider sourceId="default">
          <Router history={history}>
            <Routes>
              <Route path="/link-to" component={LinkToMetricsPage} />
              {uiCapabilities?.infrastructure?.show && (
                <RedirectWithQueryParams from="/" exact={true} to="/inventory" />
              )}
              {uiCapabilities?.infrastructure?.show && (
                <RedirectWithQueryParams from="/snapshot" exact={true} to="/inventory" />
              )}
              {uiCapabilities?.infrastructure?.show && (
                <RedirectWithQueryParams from="/metrics-explorer" exact={true} to="/explorer" />
              )}
              {uiCapabilities?.infrastructure?.show && (
                <Route path="/" component={InfrastructurePage} />
              )}
            </Routes>
          </Router>
        </SourceProvider>
      </CommonInfraProviders>
    </CoreProviders>
  );
};
