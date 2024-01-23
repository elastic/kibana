/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { Onboarding } from './lazy';
import type { StepId } from './types';

export const getOnboardingComponent = (): React.ComponentType<{
  defaultExpandedStep?: StepId;
  indicesExist?: boolean;
}> =>
  function OnBoardingComponent({
    defaultExpandedStep,
    indicesExist,
  }: {
    defaultExpandedStep?: StepId;
    indicesExist?: boolean;
  }) {
    return <Onboarding indicesExist={indicesExist} defaultExpandedStep={defaultExpandedStep} />;
  };
