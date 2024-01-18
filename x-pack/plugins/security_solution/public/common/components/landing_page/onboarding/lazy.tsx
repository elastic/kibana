/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { lazy, Suspense } from 'react';
import { EuiLoadingLogo } from '@elastic/eui';

const OnboardingLazy = lazy(() => import('./onboarding_with_settings'));

const centerLogoStyle = { display: 'flex', margin: 'auto' };

export const Onboarding = ({ indicesExist }: { indicesExist?: boolean }) => (
  <Suspense fallback={<EuiLoadingLogo logo="logoSecurity" size="xl" style={centerLogoStyle} />}>
    <OnboardingLazy indicesExist={indicesExist} />
  </Suspense>
);
