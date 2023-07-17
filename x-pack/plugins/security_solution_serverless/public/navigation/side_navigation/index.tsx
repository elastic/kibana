/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';

import type { SideNavComponent } from '@kbn/core-chrome-browser/src/project_navigation';
import { SecuritySideNavigation } from './lazy';
import { KibanaServicesProvider, type Services } from '../../common/services';

export const getSecuritySideNavComponent = (services: Services): SideNavComponent =>
  function SecuritySideNavComponent() {
    return (
      <KibanaServicesProvider services={services}>
        <SecuritySideNavigation />
      </KibanaServicesProvider>
    );
  };
