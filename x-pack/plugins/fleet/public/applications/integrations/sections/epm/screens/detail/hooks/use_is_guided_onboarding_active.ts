/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useState } from 'react';
import useObservable from 'react-use/lib/useObservable';

import { useStartServices } from '../../../../../hooks';

const isElasticDefendIntegration = (packageKey: string): boolean => {
  // TODO change to a regex
  return packageKey.startsWith('endpoint');
};

const isKubernetesIntegration = (packageKey: string): boolean => {
  // TODO change to a regex
  return packageKey.startsWith('kubernetes');
};

// currently, we're only checking for endpoint and kubernetes integrations
// for security and observability guides
const getGuideStepByIntegration = (packageKey: string) => {
  if (isElasticDefendIntegration(packageKey)) {
    return { guideID: 'security', stepID: 'add_data' };
  }
  if (isKubernetesIntegration(packageKey)) {
    return { guideID: 'observability', stepID: 'add_data' };
  }
  return { guideID: '', stepID: '' };
};
export const useIsGuidedOnboardingActive = (packageKey: string): boolean => {
  const [result, setResult] = useState<boolean>(false);
  const { guidedOnboarding } = useStartServices();
  const { guideID, stepID } = getGuideStepByIntegration(packageKey);
  const isGuidedOnboardingStepActive = useObservable(
    guidedOnboarding.guidedOnboardingApi!.isGuideStepActive$(guideID, stepID)
  );
  useEffect(() => {
    setResult(!!isGuidedOnboardingStepActive);
  }, [isGuidedOnboardingStepActive]);

  return result;
};
