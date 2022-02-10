/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { lazy, Suspense } from 'react';
import { EuiLoadingSpinner } from '@elastic/eui';
import { AllCasesSelectorModalProps } from '../components/all_cases/selector_modal';
import { CasesProvider, CasesContextProps } from '../components/cases_context';

export type GetAllCasesSelectorModalProps = AllCasesSelectorModalProps & CasesContextProps;

const AllCasesSelectorModalLazy: React.FC<AllCasesSelectorModalProps> = lazy(
  () => import('../components/all_cases/selector_modal')
);
export const getAllCasesSelectorModalLazy = ({
  owner,
  userCanCrud,
  alertData,
  hiddenStatuses,
  onRowClick,
  updateCase,
  onClose,
}: GetAllCasesSelectorModalProps) => (
  <CasesProvider value={{ owner, userCanCrud }}>
    <Suspense fallback={<EuiLoadingSpinner />}>
      <AllCasesSelectorModalLazy
        alertData={alertData}
        hiddenStatuses={hiddenStatuses}
        onRowClick={onRowClick}
        updateCase={updateCase}
        onClose={onClose}
      />
    </Suspense>
  </CasesProvider>
);
