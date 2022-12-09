/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { History } from 'history';
import { CoreStart } from '@kbn/core/public';
import React, { useLayoutEffect, useState } from 'react';
import ReactDOM from 'react-dom';
import { Router, Route, Routes } from 'react-router-dom';
import { AppMountParameters } from '@kbn/core/public';
import { Storage } from '@kbn/kibana-utils-plugin/public';
import '../index.scss';
import { NotFoundPage } from '../pages/404';
import { LinkToMetricsPage } from '../pages/link_to/link_to_metrics';
import { InfrastructurePage } from '../pages/metrics';
import { InfraClientStartDeps, InfraClientStartExports } from '../types';
import { RedirectWithQueryParams } from '../utils/redirect_with_query_params';
import { CommonInfraProviders, CoreProviders } from './common_providers';
import { prepareMountElement } from './common_styles';

export const renderApp = (
  core: CoreStart,
  plugins: InfraClientStartDeps,
  pluginStart: InfraClientStartExports,
  { element, history, setHeaderActionMenu, theme$ }: AppMountParameters
) => {
  const storage = new Storage(window.localStorage);

  prepareMountElement(element, 'infraMetricsPage');

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
  history: History;
  pluginStart: InfraClientStartExports;
  plugins: InfraClientStartDeps;
  setHeaderActionMenu: AppMountParameters['setHeaderActionMenu'];
  storage: Storage;
  theme$: AppMountParameters['theme$'];
}> = ({ core, history, pluginStart, plugins, setHeaderActionMenu, storage, theme$ }) => {
  const uiCapabilities = core.application.capabilities;

  const [state, setState] = useState({
    location: history.location,
  });

  useLayoutEffect(() => history.listen((location) => setState({ location })), [history]);

  return (
    <CoreProviders core={core} pluginStart={pluginStart} plugins={plugins} theme$={theme$}>
      <CommonInfraProviders
        appName="Metrics UI"
        setHeaderActionMenu={setHeaderActionMenu}
        storage={storage}
        theme$={theme$}
        triggersActionsUI={plugins.triggersActionsUi}
      >
        <Router navigator={history} location={state.location} basename="app/metrics">
          <Routes>
            <Route path="link-to/*" element={<LinkToMetricsPage />} />
            {uiCapabilities?.infrastructure?.show && (
              <Route path="/" element={<RedirectWithQueryParams to="inventory" />} />
            )}
            {uiCapabilities?.infrastructure?.show && (
              <Route path="snapshot" element={<RedirectWithQueryParams to="inventory" />} />
            )}
            {uiCapabilities?.infrastructure?.show && (
              <Route path="metrics-explorer" element={<RedirectWithQueryParams to="explorer" />} />
            )}
            {uiCapabilities?.infrastructure?.show && (
              <Route path="*" index element={<InfrastructurePage />} />
            )}
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Router>
      </CommonInfraProviders>
    </CoreProviders>
  );
};
