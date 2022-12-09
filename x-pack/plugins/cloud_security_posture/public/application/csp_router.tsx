/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Navigate, Route, Routes } from 'react-router-dom';
import { benchmarksNavigation, cloudPosturePages } from '../common/navigation/constants';
import type { CspSecuritySolutionContext } from '..';
import { SecuritySolutionContext } from './security_solution_context';
import * as pages from '../pages';
import { CspRoute } from './csp_route';

const queryClient = new QueryClient({
  defaultOptions: { queries: { refetchOnWindowFocus: false } },
});

/** Props for the cloud security posture router component */
export interface CspRouterProps {
  securitySolutionContext?: CspSecuritySolutionContext;
}

export const CspRouter = ({ securitySolutionContext }: CspRouterProps) => {
  const routerElement = (
    <QueryClientProvider client={queryClient}>
      <Routes>
        <CspRoute {...cloudPosturePages.findings} children={pages.Findings} />
        <CspRoute {...cloudPosturePages.dashboard} children={pages.ComplianceDashboard} />

        <CspRoute {...cloudPosturePages.benchmarks}>
          <Routes>
            <CspRoute {...benchmarksNavigation.rules} children={pages.Rules} />
            <CspRoute {...cloudPosturePages.benchmarks} children={pages.Benchmarks} />
          </Routes>
        </CspRoute>

        <Route element={<Navigate to={cloudPosturePages.dashboard.path} />} />
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
export { CspRouter as default };
