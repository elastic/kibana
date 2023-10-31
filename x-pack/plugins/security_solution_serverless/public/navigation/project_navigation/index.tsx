/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Suspense } from 'react';
import { EuiLoadingSpinner } from '@elastic/eui';

const SecuritySideNavComponentLazy = React.lazy(() => import('./project_navigation'));

export const SecuritySideNavComponent = () => (
  <Suspense fallback={<EuiLoadingSpinner size="s" />}>
    <SecuritySideNavComponentLazy />
  </Suspense>
);
