/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { Redirect, RouteProps, RouteComponentProps, Switch, Route } from 'react-router-dom';

import {
  useQuery,
  useMutation,
  useQueryClient,
  QueryClient,
  QueryClientProvider,
} from 'react-query';
import { EuiErrorBoundary } from '@elastic/eui';
import { Dashboard } from './pages/dashboard';
import { Alerts } from './pages/alerts';
import { Rules } from './pages/rules';
import { Findings } from './pages/findings';
import { SpyRoute } from '../common/utils/route/spy_routes';
import { SecurityPageName } from '../app/types';

// Create a client
const queryClient = new QueryClient();

const Providers: React.FC = ({ children }) => {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
};

const innerRoutes: RouteProps[] = [
  { path: '/csp/dashboard', render: Dashboard },
  { path: '/csp/rules', render: Rules },
  { path: '/csp/alerts', render: Alerts },
  { path: '/csp/findings', render: Findings },
];

const pages = innerRoutes.map((v) => <Route key={v.path as string} {...v} />);

const Routes = (props: RouteComponentProps<{}>) => {
  return (
    <Providers>
      <EuiErrorBoundary>
        <Switch>
          <Route path="/csp" exact render={() => <Redirect to="/csp/dashboard" />} />
          {pages}
          <Route path="*">{`Not Found`}</Route>
        </Switch>
        <SpyRoute pageName={SecurityPageName.cloud_posture} />
      </EuiErrorBoundary>
    </Providers>
  );
};

export const routes: RouteProps[] = [{ path: '/csp', render: Routes }];
