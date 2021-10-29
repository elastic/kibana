/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { lazy, Suspense } from 'react';
import { EuiLoadingSpinner } from '@elastic/eui';
import { CreateCaseFlyoutProps } from '../components/create/flyout';
import { OwnerProvider } from '../components/owner_context';
import { Owner } from '../types';

export type GetCreateCaseFlyoutProps = CreateCaseFlyoutProps & Owner;

const CreateCaseFlyout: React.FC<CreateCaseFlyoutProps> = lazy(
  () => import('../components/create/flyout')
);
export const getCreateCaseFlyoutLazy = ({ owner, ...props }: GetCreateCaseFlyoutProps) => (
  <OwnerProvider owner={owner}>
    <Suspense fallback={<EuiLoadingSpinner />}>
      <CreateCaseFlyout {...props} />
    </Suspense>
  </OwnerProvider>
);
