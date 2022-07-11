/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiPage,
  EuiPageSideBar,
  EuiSideNav,
} from '@elastic/eui';
import type { AppMountParameters, CoreStart, ScopedHistory } from '@kbn/core/public';
import React, { VFC } from 'react';
import ReactDOM from 'react-dom';
import { Redirect, Route, Router, withRouter } from 'react-router-dom';
import { IndicatorsPage } from './modules/indicators/indicators_page';
import { KibanaContextProvider } from './hooks/use_kibana';
import { Services } from './types';

interface AppProps {
  history: ScopedHistory;
  services: CoreStart;
}

const ROUTES = {
  home: '/home',
  sources: '/sources',
  indicators: '/indicators',
} as const;

const Nav = withRouter(({ history }) => (
  <EuiSideNav
    items={[
      {
        name: 'Threat intelligence',
        id: 'threatIntelligence',
        items: [
          {
            id: 'indicators',
            name: 'Indicators',
            onClick: () => history.push(ROUTES.indicators),
            'data-test-subj': 'fooNavPageB',
          },
        ],
      },
    ]}
  />
));

export const App: VFC<AppProps> = ({ history, services }) => {
  return (
    <KibanaContextProvider services={services}>
      <Router history={history}>
        <EuiPage>
          <EuiPageSideBar>
            <Nav />
          </EuiPageSideBar>
          <Route path="/" exact render={() => <Redirect to={ROUTES.indicators} />} />
          <Route path={ROUTES.indicators} exact component={IndicatorsPage} />
        </EuiPage>
      </Router>
    </KibanaContextProvider>
  );
};

/**
 * This is an entry point to the plugin. This should be lazy loaded in the plugin root composition file.
 */
export const renderApp = (services: Services, { history, element }: AppMountParameters) => {
  ReactDOM.render(<App history={history} services={services} />, element);

  return () => ReactDOM.unmountComponentAtNode(element);
};
