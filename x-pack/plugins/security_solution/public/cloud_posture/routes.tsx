/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { Redirect, RouteProps, Switch, Route } from 'react-router-dom';

import { QueryClient, QueryClientProvider } from 'react-query';
import { EuiErrorBoundary } from '@elastic/eui';
import { Findings } from './pages/findings';
import { ComplianceDashboard } from './pages/compliance_dashboard';
import { CSP_ROOT_PATH, CSP_FINDINGS_PATH, CSP_DASHBOARD_PATH } from '../../common/constants';
import { useKibana } from '../common/lib/kibana';
const Routes = () => <RedirectToCSP />;

export const routes: RouteProps[] = [{ path: '/csp', render: Routes }];

const RedirectToCSP = () => {
  const { navigateToApp } = useKibana().services?.application;
  React.useEffect(() => {
    navigateToApp('csp_root');
  }, [navigateToApp]);

  return null;
};

// const queryClient = new QueryClient();

// const Providers: React.FC = ({ children }) => {
//   return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
// };

// const innerRoutes: RouteProps[] = [
//   { path: CSP_DASHBOARD_PATH, render: ComplianceDashboard },
//   { path: CSP_FINDINGS_PATH, render: Findings },
// ];

// const pages = innerRoutes.map((v) => <Route key={v.path as string} {...v} />);

// const Routes = () => (
//   <Providers>
//     <EuiErrorBoundary>
//       <Switch>
//         <Route path={CSP_ROOT_PATH} exact render={() => <Redirect to={CSP_DASHBOARD_PATH} />} />
//         {pages}
//         <Route path="*">{`Not Found`}</Route>
//       </Switch>
//     </EuiErrorBoundary>
//   </Providers>
// );

// export const routes: RouteProps[] = [{ path: CSP_ROOT_PATH, render: Routes }];
