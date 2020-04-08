/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as React from 'react';
import ReactDOM from 'react-dom';
import { CoreStart, AppMountParameters, ScopedHistory } from 'kibana/public';
import { FormattedMessage } from '@kbn/i18n/react';
import { Route, Switch } from 'react-router-dom';
import { Store } from 'redux';
import { EndpointPluginStartDependencies } from '../../plugin';
import { appStoreFactory } from './store';
import { AlertIndex } from './view/alerts';
import { HostList } from './view/hosts';
import { PolicyList } from './view/policy';
import { PolicyDetails } from './view/policy';
import { HeaderNavigation } from './components/header_nav';
import { AppRootProvider } from './view/app_root_provider';

/**
 * This module will be loaded asynchronously to reduce the bundle size of your plugin's main bundle.
 */
export function renderApp(
  coreStart: CoreStart,
  depsStart: EndpointPluginStartDependencies,
  { element, history }: AppMountParameters
) {
  const store = appStoreFactory({ coreStart, depsStart });
  ReactDOM.render(
    <AppRoot history={history} store={store} coreStart={coreStart} depsStart={depsStart} />,
    element
  );
  return () => {
    ReactDOM.unmountComponentAtNode(element);
  };
}

interface RouterProps {
  history: ScopedHistory;
  store: Store;
  coreStart: CoreStart;
  depsStart: EndpointPluginStartDependencies;
}

const AppRoot: React.FunctionComponent<RouterProps> = React.memo(
  ({ history, store, coreStart, depsStart }) => {
    return (
      <AppRootProvider store={store} history={history} coreStart={coreStart} depsStart={depsStart}>
        <HeaderNavigation />
        <Switch>
          <Route
            exact
            path="/"
            render={() => (
              <h1 data-test-subj="welcomeTitle">
                <FormattedMessage id="xpack.endpoint.welcomeTitle" defaultMessage="Hello World" />
              </h1>
            )}
          />
          <Route path="/hosts" component={HostList} />
          <Route path="/alerts" component={AlertIndex} />
          <Route path="/policy" exact component={PolicyList} />
          <Route path="/policy/:id" exact component={PolicyDetails} />
          <Route
            render={() => (
              <FormattedMessage id="xpack.endpoint.notFound" defaultMessage="Page Not Found" />
            )}
          />
        </Switch>
      </AppRootProvider>
    );
  }
);
