/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { lazy, Suspense } from 'react';
import { EuiLoadingLogo } from '@elastic/eui';
import type { GetStartedProps } from './get_started';

const GetStartedLazy = lazy(() => import('./get_started'));

const centerLogoStyle = { display: 'flex', margin: 'auto' };

export const GetStarted = ({ productTypes }: GetStartedProps) => (
  <Suspense fallback={<EuiLoadingLogo logo="logoSecurity" size="xl" style={centerLogoStyle} />}>
    <GetStartedLazy productTypes={productTypes} />
  </Suspense>
);
