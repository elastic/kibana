/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiLoadingSpinner } from '@elastic/eui';
import React, { lazy, Suspense } from 'react';
import { CasesProvider, CasesContextProps } from '../../components/cases_context';
import { RecentCasesProps } from '../../components/recent_cases';

type GetRecentCasesPropsInternal = RecentCasesProps & CasesContextProps;
export type GetRecentCasesProps = Omit<
  GetRecentCasesPropsInternal,
  'externalReferenceAttachmentTypeRegistry'
>;

const RecentCasesLazy: React.FC<RecentCasesProps> = lazy(
  () => import('../../components/recent_cases')
);
export const getRecentCasesLazy = ({
  externalReferenceAttachmentTypeRegistry,
  owner,
  userCanCrud,
  maxCasesToShow,
}: GetRecentCasesPropsInternal) => (
  <CasesProvider value={{ externalReferenceAttachmentTypeRegistry, owner, userCanCrud }}>
    <Suspense fallback={<EuiLoadingSpinner />}>
      <RecentCasesLazy maxCasesToShow={maxCasesToShow} />
    </Suspense>
  </CasesProvider>
);
