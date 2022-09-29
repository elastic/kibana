/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useState } from 'react';
import useObservable from 'react-use/lib/useObservable';

import { useStartServices } from '../../../../../hooks';

export const useIsGuidedOnboardingActive = (packageName?: string): boolean => {
  const [result, setResult] = useState<boolean>(false);
  const { guidedOnboarding } = useStartServices();
  const isGuidedOnboardingActiveForIntegration = useObservable(
    guidedOnboarding.guidedOnboardingApi!.isGuidedOnboardingActiveForIntegration$(packageName)
  );
  useEffect(() => {
    setResult(!!isGuidedOnboardingActiveForIntegration);
  }, [isGuidedOnboardingActiveForIntegration]);

  return result;
};
