/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiPage,
  EuiPageSideBar,
  EuiSideNav,
  EuiFlexGroup,
  EuiFlexItem,
} from '@elastic/eui';
import type { AppMountParameters, CoreStart, ScopedHistory } from '@kbn/core/public';
import React, { useCallback, VFC } from 'react';
import ReactDOM from 'react-dom';
import { Redirect, Route, RouteComponentProps, Router, withRouter } from 'react-router-dom';
import { DefaultPageLayout } from './components/layout';
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
            id: 'home',
            name: 'Home',
            onClick: () => history.push(ROUTES.home),
            'data-test-subj': 'fooNavHome',
          },
          {
            id: 'sources',
            name: 'Sources',
            onClick: () => history.push(ROUTES.sources),
            'data-test-subj': 'fooNavPageA',
          },
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

const VIEW_SOURCES_LABEL = 'View sources';
const VIEW_INDICATORS_LABEL = 'View indicators';

const Home: VFC<RouteComponentProps> = ({ history }) => {
  const handleGoToSources = useCallback(() => history.push(ROUTES.indicators), [history]);
  const handleGoToIndicators = useCallback(() => history.push(ROUTES.indicators), [history]);

  return (
    <DefaultPageLayout>
      <EuiFlexGroup responsive={false} gutterSize="s">
        <EuiFlexItem grow={false}>
          <EuiButton onClick={handleGoToSources}>{VIEW_SOURCES_LABEL}</EuiButton>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButton onClick={handleGoToIndicators}>{VIEW_INDICATORS_LABEL}</EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
    </DefaultPageLayout>
  );
};

export const App: VFC<AppProps> = ({ history, services }) => {
  return (
    <KibanaContextProvider services={services}>
      <Router history={history}>
        <EuiPage>
          <EuiPageSideBar>
            <Nav />
          </EuiPageSideBar>
          <Route path="/" exact render={() => <Redirect to={ROUTES.indicators} />} />
          <Route path={ROUTES.home} exact component={Home} />
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
