/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PropsWithChildren } from 'react';
import React from 'react';
import type { OnboardingHubStepLinkClickedParams } from '../../../../lib/telemetry/events/onboarding/types';
import type { ToggleTaskCompleteStatus, CardId, ExpandedCards, OnCardClicked } from '../types';

export interface StepContextType {
  expandedCardIds: ExpandedCards;
  finishedCardIds: Set<CardId>;
  indicesExist: boolean;
  onCardClicked: OnCardClicked;
  onStepLinkClicked: (params: OnboardingHubStepLinkClickedParams) => void;
  toggleTaskCompleteStatus: ToggleTaskCompleteStatus;
}

const CardContext = React.createContext<StepContextType | null>(null);

export const CardContextProvider: React.FC<PropsWithChildren<StepContextType>> = ({
  children,
  ...others
}) => {
  return <CardContext.Provider value={others}>{children}</CardContext.Provider>;
};

export const useStepContext = () => {
  const context = React.useContext(CardContext);
  if (!context) {
    throw new Error('useStepContext must be used within a CardContextProvider');
  }
  return context;
};
