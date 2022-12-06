/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useState } from 'react';
import useObservable from 'react-use/lib/useObservable';

import { of } from 'rxjs';

import { useStartServices } from '.';

export const useIsGuidedOnboardingActive = (packageName?: string): boolean => {
  const [result, setResult] = useState<boolean>(false);
  const { guidedOnboarding } = useStartServices();
  const isGuidedOnboardingActiveForIntegration = useObservable(
    // if guided onboarding is not available, return false
    guidedOnboarding.guidedOnboardingApi
      ? guidedOnboarding.guidedOnboardingApi.isGuidedOnboardingActiveForIntegration$(packageName)
      : of(false)
  );
  useEffect(() => {
    setResult(!!isGuidedOnboardingActiveForIntegration);
  }, [isGuidedOnboardingActiveForIntegration]);

  return result;
};
