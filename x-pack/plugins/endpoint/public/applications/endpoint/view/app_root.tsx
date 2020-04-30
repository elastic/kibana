/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import * as React from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import { Route, Switch } from 'react-router-dom';
import { Store } from 'redux';
import { AlertIndex } from '../alerts/view';
import { HostList } from './hosts';
import { PolicyList } from './policy';
import { PolicyDetails } from './policy';
import { HeaderNavigation } from './components/header_navigation';
import { AppRootProvider } from './app_root_provider';
import { Setup } from './setup';
import { EndpointPluginStartDependencies } from '../../../plugin';
import { ScopedHistory, CoreStart } from '../../../../../../../src/core/public';

interface RouterProps {
  history: ScopedHistory;
  store: Store;
  coreStart: CoreStart;
  depsStart: EndpointPluginStartDependencies;
}

/**
 * The root of the Endpoint application react view.
 */
export const AppRoot: React.FunctionComponent<RouterProps> = React.memo(
  ({ history, store, coreStart, depsStart }) => {
    return (
      <AppRootProvider store={store} history={history} coreStart={coreStart} depsStart={depsStart}>
        <Setup ingestManager={depsStart.ingestManager} notifications={coreStart.notifications} />
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
