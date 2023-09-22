/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { NavigationTreeDefinition } from '@kbn/shared-ux-chrome-navigation';
import { DefaultNavigation, NavigationKibanaProvider } from '@kbn/shared-ux-chrome-navigation';
import React from 'react';
import type { SideNavComponent } from '@kbn/core-chrome-browser';
import type { Services } from '../common/services';

export const getDefaultNavigationComponent = (
  navigationTree: NavigationTreeDefinition,
  services: Services
): SideNavComponent =>
  React.memo(function SecurityDefaultNavigation() {
    return (
      <NavigationKibanaProvider
        core={services}
        serverless={services.serverless}
        cloud={services.cloud}
      >
        <DefaultNavigation navigationTree={navigationTree} dataTestSubj="securitySolutionSideNav" />
      </NavigationKibanaProvider>
    );
  });
