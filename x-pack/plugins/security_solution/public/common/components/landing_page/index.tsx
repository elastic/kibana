/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo } from 'react';
import { useSourcererDataView } from '../../containers/sourcerer';
import { getOnboardingComponent } from './onboarding';
import type { StepId } from './onboarding/types';

export const LandingPageComponent = memo(
  ({ defaultExpandedStep }: { defaultExpandedStep?: StepId }) => {
    const { indicesExist } = useSourcererDataView();
    const OnBoarding = useMemo(() => getOnboardingComponent(), []);
    return <OnBoarding indicesExist={indicesExist} defaultExpandedStep={defaultExpandedStep} />;
  }
);

LandingPageComponent.displayName = 'LandingPageComponent';
