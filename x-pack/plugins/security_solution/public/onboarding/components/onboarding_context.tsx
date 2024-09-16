/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PropsWithChildren } from 'react';
import React, { createContext, useContext } from 'react';

interface OnboardingContextValue {
  spaceId: string;
}
const OnboardingContext = createContext<OnboardingContextValue | null>(null);

export const OnboardingContextProvider: React.FC<PropsWithChildren<OnboardingContextValue>> =
  React.memo(({ children, spaceId }) => {
    return <OnboardingContext.Provider value={{ spaceId }}>{children}</OnboardingContext.Provider>;
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
