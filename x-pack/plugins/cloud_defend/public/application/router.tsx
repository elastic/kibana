/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Redirect } from 'react-router-dom';
import { Routes, Route } from '@kbn/shared-ux-router';
import { cloudDefendPages } from '../common/navigation/constants';
import type { CloudDefendSecuritySolutionContext } from '../types';
import { SecuritySolutionContext } from './security_solution_context';
import { Policies } from '../pages/policies';
import { CloudDefendRoute } from './route';

const queryClient = new QueryClient({
  defaultOptions: { queries: { refetchOnWindowFocus: false } },
});

export interface CloudDefendRouterProps {
  securitySolutionContext?: CloudDefendSecuritySolutionContext;
}

export const CloudDefendRouter = ({ securitySolutionContext }: CloudDefendRouterProps) => {
  const routerElement = (
    <QueryClientProvider client={queryClient}>
      <Routes>
        <CloudDefendRoute {...cloudDefendPages.policies} component={Policies} />

        <Route>
          <Redirect to={cloudDefendPages.policies.path} />
        </Route>
      </Routes>
    </QueryClientProvider>
  );

  if (securitySolutionContext) {
    return (
      <SecuritySolutionContext.Provider value={securitySolutionContext}>
        {routerElement}
      </SecuritySolutionContext.Provider>
    );
  }

  return <>{routerElement}</>;
};

// Using a default export for usage with `React.lazy`
// eslint-disable-next-line import/no-default-export
export { CloudDefendRouter as default };
