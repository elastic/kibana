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
import { Nav } from './components/nav';
import { Home } from './components/home';
import { Management } from './components/management';

const EndpointRouter = ({ basename, context }: { basename: string; context: AppMountContext }) => (
  <Router basename={basename}>
    <EuiPage>
      <EuiPageSideBar>
        <Nav navigateToApp={context.core.application.navigateToApp} />
      </EuiPageSideBar>
      <Route path="/" exact component={Home} />
      <Route path="/management" component={Management} />
    </EuiPage>
  </Router>
);

export const renderApp = (
  context: AppMountContext,
  { appBasePath, element }: AppMountParameters
) => {
  ReactDOM.render(<EndpointRouter basename={appBasePath} context={context} />, element);

  return () => ReactDOM.unmountComponentAtNode(element);
};
