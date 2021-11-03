/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiLoadingSpinner } from '@elastic/eui';
import React, { lazy, Suspense } from 'react';
import type { CasesProps } from '../components/app';
import { CasesProvider, CasesContextValue } from '../components/cases_context';

export type GetCasesProps = CasesProps & CasesContextValue;

const CasesLazy = lazy(() => import('../components/app'));
export const getCasesLazy = ({ owner, appId, userCanCrud, ...props }: GetCasesProps) => (
  <CasesProvider value={{ owner, appId, userCanCrud }}>
    <Suspense fallback={<EuiLoadingSpinner />}>
      <CasesLazy {...props} />
    </Suspense>
  </CasesProvider>
);
