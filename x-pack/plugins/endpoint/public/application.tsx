/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import ReactDOM from 'react-dom';
import { BrowserRouter as Router, Route, withRouter, RouteComponentProps } from 'react-router-dom';

import {
  EuiPage,
  EuiPageBody,
  EuiPageContent,
  EuiPageContentBody,
  EuiPageContentHeader,
  EuiPageContentHeaderSection,
  EuiPageHeader,
  EuiPageHeaderSection,
  EuiPageSideBar,
  EuiTitle,
  EuiSideNav,
} from '@elastic/eui';

import { AppMountContext, AppMountParameters } from 'kibana/public';

const Home = () => (
  <EuiPageBody>
    <EuiPageHeader>
      <EuiPageHeaderSection>
        <EuiTitle size="l">
          <h1>Welcome to Endpoint!</h1>
        </EuiTitle>
      </EuiPageHeaderSection>
    </EuiPageHeader>
    <EuiPageContent>
      <EuiPageContentHeader>
        <EuiPageContentHeaderSection>
          <EuiTitle>
            <h2>Home Page</h2>
          </EuiTitle>
        </EuiPageContentHeaderSection>
      </EuiPageContentHeader>
      <EuiPageContentBody>Body Content</EuiPageContentBody>
    </EuiPageContent>
  </EuiPageBody>
);

const PageA = () => (
  <EuiPageBody data-test-subj="fooAppPageA">
    <EuiPageHeader>
      <EuiPageHeaderSection>
        <EuiTitle size="l">
          <h1>Page A</h1>
        </EuiTitle>
      </EuiPageHeaderSection>
    </EuiPageHeader>
    <EuiPageContent>
      <EuiPageContentHeader>
        <EuiPageContentHeaderSection>
          <EuiTitle>
            <h2>Page A section title</h2>
          </EuiTitle>
        </EuiPageContentHeaderSection>
      </EuiPageContentHeader>
      <EuiPageContentBody>Page A's content goes here</EuiPageContentBody>
    </EuiPageContent>
  </EuiPageBody>
);

type NavProps = RouteComponentProps & {
  navigateToApp: AppMountContext['core']['application']['navigateToApp'];
};
const Nav = withRouter(({ history, navigateToApp }: NavProps) => (
  <EuiSideNav
    items={[
      {
        name: 'Foo',
        id: 'foo',
        items: [
          {
            id: 'home',
            name: 'Home',
            onClick: () => history.push('/'),
            'data-test-subj': 'fooNavHome',
          },
          {
            id: 'page-a',
            name: 'Page A',
            onClick: () => history.push('/page-a'),
            'data-test-subj': 'fooNavPageA',
          },
          {
            id: 'linktobar',
            name: 'Open Bar / Page B',
            onClick: () => navigateToApp('bar', { path: 'page-b?query=here', state: 'foo!!' }),
            'data-test-subj': 'fooNavBarPageB',
          },
        ],
      },
    ]}
  />
));

const FooApp = ({ basename, context }: { basename: string; context: AppMountContext }) => (
  <Router basename={basename}>
    <EuiPage>
      <EuiPageSideBar>
        <Nav navigateToApp={context.core.application.navigateToApp} />
      </EuiPageSideBar>
      <Route path="/" exact component={Home} />
      <Route path="/page-a" component={PageA} />
    </EuiPage>
  </Router>
);

export const renderApp = (
  context: AppMountContext,
  { appBasePath, element }: AppMountParameters
) => {
  ReactDOM.render(<FooApp basename={appBasePath} context={context} />, element);

  return () => ReactDOM.unmountComponentAtNode(element);
};
