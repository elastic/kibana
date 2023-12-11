/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { lazy, Suspense } from 'react';
import { EuiLoadingSpinner } from '@elastic/eui';
import type { SideNavComponent } from '@kbn/core-chrome-browser';

const SecuritySideNavigationLazy = lazy(() => import('./side_navigation'));

export const SecuritySideNavigation: SideNavComponent = (props) => (
  <Suspense fallback={<EuiLoadingSpinner size="m" />}>
    <SecuritySideNavigationLazy {...props} />
  </Suspense>
);
