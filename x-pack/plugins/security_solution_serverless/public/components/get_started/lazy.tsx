/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { lazy, Suspense } from 'react';
import { EuiLoadingLogo } from '@elastic/eui';
import { SecurityProductTypes } from '../../../common/config';

const GetStartedLazy = lazy(() => import('./get_started'));

const centerLogoStyle = { display: 'flex', margin: 'auto' };

export const GetStarted = ({ productTypes }: { productTypes: SecurityProductTypes }) => (
  <Suspense fallback={<EuiLoadingLogo logo="logoSecurity" size="xl" style={centerLogoStyle} />}>
    <GetStartedLazy productTypes={productTypes} />
  </Suspense>
);
