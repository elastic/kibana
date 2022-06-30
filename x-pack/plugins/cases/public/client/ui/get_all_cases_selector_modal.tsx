/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { lazy, Suspense } from 'react';
import { EuiLoadingSpinner } from '@elastic/eui';
import { AllCasesSelectorModalProps } from '../../components/all_cases/selector_modal';
import { CasesProvider, CasesContextProps } from '../../components/cases_context';

type GetAllCasesSelectorModalPropsInternal = AllCasesSelectorModalProps & CasesContextProps;
export type GetAllCasesSelectorModalProps = Omit<
  GetAllCasesSelectorModalPropsInternal,
  'externalReferenceAttachmentTypeRegistry'
>;

const AllCasesSelectorModalLazy: React.FC<AllCasesSelectorModalProps> = lazy(
  () => import('../../components/all_cases/selector_modal')
);
export const getAllCasesSelectorModalLazy = ({
  externalReferenceAttachmentTypeRegistry,
  owner,
  userCanCrud,
  hiddenStatuses,
  onRowClick,
  onClose,
}: GetAllCasesSelectorModalPropsInternal) => (
  <CasesProvider value={{ externalReferenceAttachmentTypeRegistry, owner, userCanCrud }}>
    <Suspense fallback={<EuiLoadingSpinner />}>
      <AllCasesSelectorModalLazy
        hiddenStatuses={hiddenStatuses}
        onRowClick={onRowClick}
        onClose={onClose}
      />
    </Suspense>
  </CasesProvider>
);

/**
 * Same as getAllCasesSelectorModalLazy but without injecting the
 * cases provider. to be further refactored https://github.com/elastic/kibana/issues/123183
 */
export const getAllCasesSelectorModalNoProviderLazy = ({
  hiddenStatuses,
  onRowClick,
  onClose,
}: AllCasesSelectorModalProps) => (
  <Suspense fallback={<EuiLoadingSpinner />}>
    <AllCasesSelectorModalLazy
      hiddenStatuses={hiddenStatuses}
      onRowClick={onRowClick}
      onClose={onClose}
    />
  </Suspense>
);
