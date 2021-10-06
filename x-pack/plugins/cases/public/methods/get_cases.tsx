/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiLoadingSpinner } from '@elastic/eui';
import React, { lazy, Suspense } from 'react';
import type { CasesProps } from '../components/app';

const CasesLazy = lazy(() => import('../components/app'));
export const getCasesLazy = (props: CasesProps) => (
  <Suspense fallback={<EuiLoadingSpinner />}>
    <CasesLazy {...props} />
  </Suspense>
);
