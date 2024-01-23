/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { lazy, Suspense } from 'react';
import { EuiLoadingLogo } from '@elastic/eui';
import type { StepId } from './types';

const OnboardingLazy = lazy(() => import('./onboarding_with_settings'));

const centerLogoStyle = { display: 'flex', margin: 'auto' };

export const Onboarding = ({
  defaultExpandedStep,
  indicesExist,
}: {
  defaultExpandedStep?: StepId;
  indicesExist?: boolean;
}) => (
  <Suspense fallback={<EuiLoadingLogo logo="logoSecurity" size="xl" style={centerLogoStyle} />}>
    <OnboardingLazy indicesExist={indicesExist} defaultExpandedStep={defaultExpandedStep} />
  </Suspense>
);
