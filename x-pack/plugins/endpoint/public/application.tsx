/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useEffect, ReactElement } from 'react';
import ReactDOM from 'react-dom';
import { Router, Route, useLocation } from 'react-router-dom';

import { createBrowserHistory, History } from 'history';
import { Provider, useDispatch } from 'react-redux';
import { EuiPage, EuiPageSideBar } from '@elastic/eui';
import { AppMountContext, AppMountParameters } from 'kibana/public';
import { storeFactory } from './store';
import { Nav } from './components/nav';
import { Home } from './components/home';
import { Management } from './components/management';
import { AlertList } from './components/alert_list';
import { AlertDetails } from './components/alert_details';
import { EndpointsPage } from './components/endpoints_page';

const LocationChangeWrapper = function({ children }: { children: ReactElement }) {
  const location = useLocation();
  const dispatch = useDispatch();
  useEffect(() => {
    dispatch({
      type: 'LOCATION_CHANGE',
      payload: {},
    });
  }, [dispatch, location]);
  return <>{children}</>;
};

const EndpointRouter = ({
  history,
  context,
  store,
}: {
  history: History;
  context: AppMountContext;
  store: any;
}) => {
  return (
    <Provider store={store}>
      <Router history={history}>
        <LocationChangeWrapper>
          <EuiPage>
            <EuiPageSideBar>
              <Nav navigateToApp={context.core.application.navigateToApp} />
            </EuiPageSideBar>
            <Route path="/" exact component={Home} />
            <Route path="/management" component={Management} />
            <Route path="/endpoints" component={EndpointsPage} />
            <Route path="/alerts" render={() => <AlertList />} />
            <Route path="/alerts/:alertId" render={() => <AlertDetails />} />
          </EuiPage>
        </LocationChangeWrapper>
      </Router>
    </Provider>
  );
};

export const renderApp = (
  context: AppMountContext,
  { appBasePath, element }: AppMountParameters
) => {
  const history = createBrowserHistory({ basename: appBasePath });
  const store = storeFactory(context, history);
  ReactDOM.render(<EndpointRouter history={history} context={context} store={store} />, element);

  return () => ReactDOM.unmountComponentAtNode(element);
};
