/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { lazy, Suspense } from 'react';
import { EuiLoadingSpinner } from '@elastic/eui';
import type { NoPrivilegesPageProps } from './app/no_privileges';

const NoPrivilegesPageLazy: React.FC<NoPrivilegesPageProps> = lazy(
  () => import('./app/no_privileges')
);

export const getNoPrivilegesPageLazy = (props: NoPrivilegesPageProps) => (
  <Suspense fallback={<EuiLoadingSpinner />}>
    <NoPrivilegesPageLazy {...props} />
  </Suspense>
);
