/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiLoadingSpinner } from '@elastic/eui';
import React, { lazy, Suspense } from 'react';
import { ConfigureCasesProps } from '../components/configure_cases';

const ConfigureCasesLazy = lazy(() => import('../components/configure_cases'));
export const getConfigureCasesLazy = (props: ConfigureCasesProps) => (
  <Suspense fallback={<EuiLoadingSpinner />}>
    <ConfigureCasesLazy {...props} />
  </Suspense>
);
