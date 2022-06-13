/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { History } from 'history';
import { CoreStart } from 'kibana/public';
import React from 'react';
import ReactDOM from 'react-dom';
import { Route, Router, Switch } from 'react-router-dom';
import { AppMountParameters } from '../../../../../src/core/public';
import { Storage } from '../../../../../src/plugins/kibana_utils/public';
import '../index.scss';
import { NotFoundPage } from '../pages/404';
import { LinkToLogsPage } from '../pages/link_to/link_to_logs';
import { LogsPage } from '../pages/logs';
import { InfraClientStartDeps, InfraClientStartExports } from '../types';
import { CommonInfraProviders, CoreProviders } from './common_providers';
import { prepareMountElement } from './common_styles';

export const renderApp = (
  core: CoreStart,
  plugins: InfraClientStartDeps,
  pluginStart: InfraClientStartExports,
  { element, history, setHeaderActionMenu, theme$ }: AppMountParameters
) => {
  const storage = new Storage(window.localStorage);

  prepareMountElement(element, 'infraLogsPage');

  ReactDOM.render(
    <LogsApp
      core={core}
      storage={storage}
      history={history}
      plugins={plugins}
      pluginStart={pluginStart}
      setHeaderActionMenu={setHeaderActionMenu}
      theme$={theme$}
    />,
    element
  );

  return () => {
    ReactDOM.unmountComponentAtNode(element);
  };
};

const LogsApp: React.FC<{
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
        appName="Logs UI"
        setHeaderActionMenu={setHeaderActionMenu}
        storage={storage}
        theme$={theme$}
        triggersActionsUI={plugins.triggersActionsUi}
      >
        <Router history={history}>
          <Switch>
            <Route path="/link-to" component={LinkToLogsPage} />
            {uiCapabilities?.logs?.show && <Route path="/" component={LogsPage} />}
            <Route component={NotFoundPage} />
          </Switch>
        </Router>
      </CommonInfraProviders>
    </CoreProviders>
  );
};
