/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { Suspense } from 'react';
import { EuiLoadingSpinner } from '@elastic/eui';
import type { NavigationTreeDefinition } from '@kbn/shared-ux-chrome-navigation';
import type { SideNavComponent } from '@kbn/core-chrome-browser';
import type { Services } from '../common/services';

const SecurityDefaultNavigationLazy = React.lazy(() =>
  import('@kbn/shared-ux-chrome-navigation').then(
    ({ DefaultNavigation, NavigationKibanaProvider }) => ({
      default: React.memo<{
        navigationTree: NavigationTreeDefinition;
        services: Services;
      }>(function SecurityDefaultNavigation({ navigationTree, services }) {
        return (
          <NavigationKibanaProvider
            core={services}
            serverless={services.serverless}
            cloud={services.cloud}
          >
            <DefaultNavigation
              navigationTree={navigationTree}
              dataTestSubj="securitySolutionSideNav"
            />
          </NavigationKibanaProvider>
        );
      }),
    })
  )
);

export const getDefaultNavigationComponent = (
  navigationTree: NavigationTreeDefinition,
  services: Services
): SideNavComponent =>
  function SecuritySideNavComponent() {
    return (
      <Suspense fallback={<EuiLoadingSpinner size="m" />}>
        <SecurityDefaultNavigationLazy navigationTree={navigationTree} services={services} />
      </Suspense>
    );
  };
