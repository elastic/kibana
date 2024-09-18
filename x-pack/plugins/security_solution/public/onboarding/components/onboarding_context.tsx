/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PropsWithChildren } from 'react';
import React, { createContext, useContext, useMemo } from 'react';
import { useKibana } from '../../common/lib/kibana/kibana_react';
import type { OnboardingCardId } from '../constants';

interface OnboardingContextValue {
  spaceId: string;
  reportCardOpen: (cardId: OnboardingCardId, options?: { auto?: boolean }) => void;
  reportCardComplete: (cardId: OnboardingCardId, options?: { auto?: boolean }) => void;
  reportCardLinkClicked: (cardId: OnboardingCardId, linkId: string) => void;
}
const OnboardingContext = createContext<OnboardingContextValue | null>(null);

export const OnboardingContextProvider: React.FC<PropsWithChildren<{ spaceId: string }>> =
  React.memo(({ children, spaceId }) => {
    const { telemetry } = useKibana().services;

    const value = useMemo<OnboardingContextValue>(
      () => ({
        spaceId,
        reportCardOpen: (cardId, { auto = false } = {}) => {
          telemetry.reportOnboardingHubStepOpen({
            stepId: cardId,
            trigger: auto ? 'navigation' : 'click',
          });
        },
        reportCardComplete: (cardId, { auto = false } = {}) => {
          telemetry.reportOnboardingHubStepFinished({
            stepId: cardId,
            trigger: auto ? 'auto_check' : 'click',
          });
        },
        reportCardLinkClicked: (cardId, linkId: string) => {
          telemetry.reportOnboardingHubStepLinkClicked({
            originStepId: cardId,
            stepLinkId: linkId,
          });
        },
      }),
      [spaceId, telemetry]
    );

    return <OnboardingContext.Provider value={value}>{children}</OnboardingContext.Provider>;
  });
OnboardingContextProvider.displayName = 'OnboardingContextProvider';

export const useOnboardingContext = () => {
  const context = useContext(OnboardingContext);
  if (!context) {
    throw new Error(
      'No OnboardingContext found. Please wrap the application with OnboardingProvider'
    );
  }
  return context;
};
