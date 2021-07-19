/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { lazy, Suspense } from 'react';
import { EuiLoadingSpinner } from '@elastic/eui';
import { CaseViewProps } from '../components/case_view';

const CaseViewLazy = lazy(() => import('../components/case_view'));
export const getCaseViewLazy = (props: CaseViewProps) => (
  <Suspense fallback={<EuiLoadingSpinner />}>
    <CaseViewLazy {...props} />
  </Suspense>
);
