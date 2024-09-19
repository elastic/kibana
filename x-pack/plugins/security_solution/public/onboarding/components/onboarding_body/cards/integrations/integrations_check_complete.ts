/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { OnboardingCardCheckComplete } from '../../../../types';
import { getDummyAdditionalBadge } from './integrations_header_badges';

export const checkIntegrationsCardComplete: OnboardingCardCheckComplete = async () => {
  // implement this function
  return new Promise((resolve) =>
    setTimeout(
      () =>
        resolve({
          isComplete: true,
          completeBadgeText: '3 integrations installed',
          additionalBadges: [getDummyAdditionalBadge()],
          metadata: {
            integrationsInstalled: 3,
          },
        }),
      2000
    )
  );
};
