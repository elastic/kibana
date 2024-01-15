/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { lazy, Suspense } from 'react';
import { EuiLoadingSpinner } from '@elastic/eui';

const DashboardsLandingCalloutLazy = lazy(() => import('./dashboard_landing_callout'));

export const DashboardsLandingCallout = () => (
  <Suspense fallback={<EuiLoadingSpinner size="s" />}>
    <DashboardsLandingCalloutLazy />
  </Suspense>
);
