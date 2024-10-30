/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { OnboardingContextValue } from '../onboarding_context';
import {
  mockReportCardOpen,
  mockReportCardComplete,
  mockReportCardLinkClicked,
} from './onboarding_context_mocks';

export const useOnboardingContext = (): OnboardingContextValue => {
  return {
    spaceId: 'default',
    reportCardOpen: mockReportCardOpen,
    reportCardComplete: mockReportCardComplete,
    reportCardLinkClicked: mockReportCardLinkClicked,
  };
};
