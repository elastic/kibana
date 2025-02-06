/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';

import { AVCResultsBanner, useIsStillYear2025 } from '@kbn/avc-banner';
import { useStoredIsAVCBannerDismissed } from '../../hooks/use_stored_state';

export const OnboardingBanner = React.memo(() => {
  const [isAVCBannerDismissed, setIsAVCBannerDismissed] = useStoredIsAVCBannerDismissed();
  const isStillYear2025 = useIsStillYear2025();

  const dismissAVCBanner = useCallback(() => {
    setIsAVCBannerDismissed(true);
  }, [setIsAVCBannerDismissed]);

  if (isAVCBannerDismissed || !isStillYear2025) {
    return null;
  }

  return <AVCResultsBanner onDismiss={dismissAVCBanner} />;
});
OnboardingBanner.displayName = 'OnboardingBanner';
