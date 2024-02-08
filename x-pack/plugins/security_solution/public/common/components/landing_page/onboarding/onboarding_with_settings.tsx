/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useAvailableSteps } from './hooks/use_available_steps';
import { useProductTypes } from './hooks/use_product_types';
import { Onboarding } from './onboarding';

export const OnboardingWithSettingsComponent: React.FC<{ indicesExist?: boolean }> = ({
  indicesExist,
}) => {
  const productTypes = useProductTypes();
  const onboardingSteps = useAvailableSteps();

  if (!onboardingSteps) {
    return null;
  }

  return (
    <Onboarding
      indicesExist={indicesExist}
      productTypes={productTypes}
      onboardingSteps={onboardingSteps}
    />
  );
};

// eslint-disable-next-line import/no-default-export
export default OnboardingWithSettingsComponent;
