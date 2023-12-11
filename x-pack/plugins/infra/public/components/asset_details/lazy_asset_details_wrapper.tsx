/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiLoadingSpinner } from '@elastic/eui';
import type { AssetDetailsProps } from './types';

const AssetDetails = React.lazy(() => import('./asset_details'));

export const LazyAssetDetailsWrapper = (props: AssetDetailsProps) => (
  <React.Suspense fallback={<EuiLoadingSpinner />}>
    <AssetDetails {...props} />
  </React.Suspense>
);
