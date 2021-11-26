/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { lazy, Suspense } from 'react';
import { EuiLoadingSpinner } from '@elastic/eui';
import type { CreateCaseFlyoutProps } from '../components/create/flyout';
import { CasesProvider, CasesContextProps } from '../components/cases_context';

export type GetCreateCaseFlyoutProps = CreateCaseFlyoutProps & CasesContextProps;

const CreateCaseFlyoutLazy: React.FC<CreateCaseFlyoutProps> = lazy(
  () => import('../components/create/flyout')
);
export const getCreateCaseFlyoutLazy = ({
  owner,
  userCanCrud,
  afterCaseCreated,
  onClose,
  onSuccess,
  disableAlerts,
}: GetCreateCaseFlyoutProps) => (
  <CasesProvider value={{ owner, userCanCrud }}>
    <Suspense fallback={<EuiLoadingSpinner />}>
      <CreateCaseFlyoutLazy
        afterCaseCreated={afterCaseCreated}
        onClose={onClose}
        onSuccess={onSuccess}
        disableAlerts={disableAlerts}
      />
    </Suspense>
  </CasesProvider>
);
