/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiLoadingSpinner } from '@elastic/eui';
import React, { lazy, ReactNode, Suspense } from 'react';
import { CasesContextProps } from '../../components/cases_context';

export type GetCasesContextProps = CasesContextProps;

const CasesProviderLazy: React.FC<{ value: GetCasesContextProps }> = lazy(
  () => import('../../components/cases_context')
);

const CasesProviderLazyWrapper = ({
  owner,
  userCanCrud,
  features,
  children,
  releasePhase,
}: GetCasesContextProps & { children: ReactNode }) => {
  return (
    <Suspense fallback={<EuiLoadingSpinner />}>
      <CasesProviderLazy value={{ owner, userCanCrud, features, releasePhase }}>
        {children}
      </CasesProviderLazy>
    </Suspense>
  );
};
CasesProviderLazyWrapper.displayName = 'CasesProviderLazyWrapper';

export const getCasesContextLazy = () => {
  return CasesProviderLazyWrapper;
};
