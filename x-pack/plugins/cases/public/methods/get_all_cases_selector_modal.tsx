/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { lazy, Suspense } from 'react';
import { EuiLoadingSpinner } from '@elastic/eui';
import { AllCasesSelectorModalProps } from '../components/all_cases/selector_modal';
import { OwnerProvider } from '../components/owner_context';
import { Owner } from '../types';

const AllCasesSelectorModalLazy = lazy(() => import('../components/all_cases/selector_modal'));
export const getAllCasesSelectorModalLazy = (props: AllCasesSelectorModalProps & Owner) => (
  <OwnerProvider owner={props.owner}>
    <Suspense fallback={<EuiLoadingSpinner />}>
      <AllCasesSelectorModalLazy {...props} />
    </Suspense>
  </OwnerProvider>
);
