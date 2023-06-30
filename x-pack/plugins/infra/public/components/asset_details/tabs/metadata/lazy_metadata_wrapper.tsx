/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiLoadingSpinner } from '@elastic/eui';
import type { MetadataProps } from './metadata';

const Metadata = React.lazy(() => import('./metadata'));

export const LazyMetadataWrapper = (props: MetadataProps) => (
  <React.Suspense fallback={<EuiLoadingSpinner />}>
    <Metadata {...props} />
  </React.Suspense>
);
