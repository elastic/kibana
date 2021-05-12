/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiLoadingSpinner } from '@elastic/eui';
import React, { lazy, Suspense } from 'react';
import { AllCasesProps } from '../components/all_cases';
import { OwnerProvider } from '../components/owner_context';
import { Owner } from '../types';

const AllCasesLazy = lazy(() => import('../components/all_cases'));
export const getAllCasesLazy = (props: AllCasesProps & Owner) => (
  <OwnerProvider owner={props.owner}>
    <Suspense fallback={<EuiLoadingSpinner />}>
      <AllCasesLazy {...props} />
    </Suspense>
  </OwnerProvider>
);
