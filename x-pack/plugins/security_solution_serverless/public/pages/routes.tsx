/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { lazy, Suspense } from 'react';
import { EuiLoadingSpinner } from '@elastic/eui';
import { SecurityPageName } from '@kbn/security-solution-navigation';
import type { RouteProps } from 'react-router-dom';
import { withServicesProvider, type Services } from '../common/services';
import { SecurityPagePath } from '../navigation/links/constants';

const withSuspense = <T extends object = {}>(Component: React.ComponentType<T>): React.FC<T> =>
  function LazyPageWithSuspense(props) {
    return (
      <Suspense fallback={<EuiLoadingSpinner size="xl" />}>
        <Component {...props} />
      </Suspense>
    );
  };

const MachineLearningPageLazy = lazy(() => import('./machine_learning'));
const MachineLearningPage = withSuspense(MachineLearningPageLazy);

// Sets the project specific routes for Serverless as extra routes in the Security Solution plugin
export const setRoutes = (services: Services) => {
  const projectRoutes: RouteProps[] = [
    {
      path: SecurityPagePath[SecurityPageName.mlLanding],
      component: withServicesProvider(MachineLearningPage, services),
    },
  ];
  services.securitySolution.setExtraRoutes(projectRoutes);
};
