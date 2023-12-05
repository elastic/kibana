/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { defaultExpandedCards } from '../../storage';
import { CreateProjectSteps, QuickStartSectionCardsId } from '../../types';

export const StepContextProvider = ({ children }: { children: React.ReactElement }) => (
  <>{children}</>
);

export const useStepContext = () => {
  return {
    expandedCardSteps: defaultExpandedCards,
    finishedSteps: {
      [QuickStartSectionCardsId.createFirstProject]: new Set([
        CreateProjectSteps.createFirstProject,
      ]),
    },
    onStepClicked: jest.fn(),
    toggleTaskCompleteStatus: jest.fn(),
  };
};
