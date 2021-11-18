/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { Redirect, RouteProps, RouteComponentProps, Switch, Route } from 'react-router-dom';

import { QueryClient, QueryClientProvider } from 'react-query';
import { EuiErrorBoundary } from '@elastic/eui';
import { Dashboard } from './pages/dashboard';
import { Findings } from './pages/findings';

const queryClient = new QueryClient();

const Providers: React.FC = ({ children }) => {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
};

const innerRoutes: RouteProps[] = [
  { path: '/csp/dashboard', render: Dashboard },
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
      </EuiErrorBoundary>
    </Providers>
  );
};

export const routes: RouteProps[] = [{ path: '/csp', render: Routes }];
