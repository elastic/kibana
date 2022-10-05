/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { lazy, Suspense } from 'react';
import { EuiLoadingSpinner } from '@elastic/eui';
import type { Capabilities } from '@kbn/core/public';

const RedirectRouteLazy: React.FC<{ capabilities: Capabilities }> = lazy(() => import('./helpers'));

export const getRedirectRouteLazy = (props: { capabilities: Capabilities }) => (
  <Suspense fallback={<EuiLoadingSpinner />}>
    <RedirectRouteLazy {...props} />
  </Suspense>
);
