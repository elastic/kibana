/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton, EuiPage, EuiPageSideBar, EuiSideNav } from '@elastic/eui';
import type { AppMountParameters, CoreStart, ScopedHistory } from '@kbn/core/public';
import React, { useCallback, VFC } from 'react';
import ReactDOM from 'react-dom';
import { Redirect, Route, RouteComponentProps, Router, withRouter } from 'react-router-dom';
import { DefaultPageLayout } from './components/layout';
import { CoreStartProvider } from './context/core_start';
import { SourcesPage } from './modules/sources/sources_page';

interface AppProps {
  history: ScopedHistory;
  coreStart: CoreStart;
}

const ROUTES = {
  home: '/home',
  sources: '/sources',
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
        ],
      },
    ]}
  />
));

const VIEW_INDICATORS_LABEL = 'View sources';

const Home: VFC<RouteComponentProps> = ({ history }) => {
  const handleGoToIndicators = useCallback(() => history.push(ROUTES.sources), [history]);

  return (
    <DefaultPageLayout>
      <EuiButton onClick={handleGoToIndicators}>{VIEW_INDICATORS_LABEL}</EuiButton>
    </DefaultPageLayout>
  );
};

export const App: VFC<AppProps> = ({ history, coreStart }) => {
  return (
    <CoreStartProvider value={coreStart}>
      <Router history={history}>
        <EuiPage>
          <EuiPageSideBar>
            <Nav />
          </EuiPageSideBar>
          <Route path="/" exact render={() => <Redirect to={ROUTES.sources} />} />
          <Route path={ROUTES.home} exact component={Home} />
          <Route path={ROUTES.sources} exact component={SourcesPage} />
        </EuiPage>
      </Router>
    </CoreStartProvider>
  );
};

/**
 * This is an entry point to the plugin. This should be lazy loaded in the plugin root composition file.
 */
export const renderApp = (coreStart: CoreStart, { history, element }: AppMountParameters) => {
  ReactDOM.render(<App history={history} coreStart={coreStart} />, element);

  return () => ReactDOM.unmountComponentAtNode(element);
};
