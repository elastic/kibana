/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { lazy, Suspense } from 'react';
import { EuiLoadingSpinner } from '@elastic/eui';
import { CreateCaseProps } from '../components/create';
import { Owner } from '../types';
import { OwnerProvider } from '../components/owner_context';

const CreateCaseLazy = lazy(() => import('../components/create'));
export const getCreateCaseLazy = (props: CreateCaseProps & Owner) => (
  <OwnerProvider owner={props.owner}>
    <Suspense fallback={<EuiLoadingSpinner />}>
      <CreateCaseLazy {...props} />
    </Suspense>
  </OwnerProvider>
);
