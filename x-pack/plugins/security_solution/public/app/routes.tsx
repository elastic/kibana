/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { History } from 'history';
import React, { FC, memo, useEffect } from 'react';
import { Route, Router, Switch } from 'react-router-dom';

import { useDispatch } from 'react-redux';
import { NotFoundPage } from './404';
import { HomePage } from './home';
import { ManageRoutesSpy } from '../common/utils/route/manage_spy_routes';
import { RouteCapture } from '../common/components/endpoint/route_capture';
import { AppAction } from '../common/store/actions';

interface RouterProps {
  children: React.ReactNode;
  history: History;
}

const PageRouterComponent: FC<RouterProps> = ({ history, children }) => {
  const dispatch = useDispatch<(action: AppAction) => void>();
  useEffect(() => {
    return () => {
      // When app is dismounted via a non-router method (ex. using Kibana's `services.application.navigateToApp()`)
      // ensure that one last `userChangedUrl` store action is dispatched, which will help trigger state reset logic
      dispatch({
        type: 'userChangedUrl',
        payload: { pathname: '', search: '', hash: '' },
      });
    };
  }, [dispatch]);

  return (
    <ManageRoutesSpy>
      <Router history={history}>
        <RouteCapture>
          <Switch>
            <Route path="/">
              <HomePage>{children}</HomePage>
            </Route>
            <Route>
              <NotFoundPage />
            </Route>
          </Switch>
        </RouteCapture>
      </Router>
    </ManageRoutesSpy>
  );
};

export const PageRouter = memo(PageRouterComponent);
