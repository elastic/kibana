/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useSpaceId } from '../../../hooks/use_space_id';
import { useAvailableSteps } from './hooks/use_available_steps';
import { useProductTypes } from './hooks/use_product_types';
import { Onboarding } from './onboarding';

const OnboardingWithSettingsComponent: React.FC<{ indicesExist?: boolean }> = ({
  indicesExist,
}) => {
  const productTypes = useProductTypes();
  const onboardingSteps = useAvailableSteps();
  const spaceId = useSpaceId();

  /* spaceId returns undefined if the space is loading.
   ** We render the onboarding component only when spaceId is ready
   ** to make sure it reads the local storage data with the correct spaceId.
   */
  if (!onboardingSteps || !spaceId) {
    return null;
  }

  return (
    <Onboarding
      indicesExist={indicesExist}
      productTypes={productTypes}
      onboardingSteps={onboardingSteps}
      spaceId={spaceId}
    />
  );
};

export const OnboardingWithSettings = React.memo(OnboardingWithSettingsComponent);

// eslint-disable-next-line import/no-default-export
export default OnboardingWithSettings;
