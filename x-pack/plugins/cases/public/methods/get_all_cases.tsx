/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiLoadingSpinner } from '@elastic/eui';
import React, { lazy, Suspense } from 'react';
import { AllCasesProps } from '../components/all_cases';

const AllCasesLazy = lazy(() => import('../components/all_cases'));
export const getAllCasesLazy = (props: AllCasesProps) => (
  <Suspense fallback={<EuiLoadingSpinner />}>
    <AllCasesLazy {...props} />
  </Suspense>
);
