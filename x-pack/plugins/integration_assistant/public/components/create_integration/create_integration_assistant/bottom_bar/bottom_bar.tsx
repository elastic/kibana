/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { ButtonsFooter } from '../../../../common/components/buttons_footer';
import type { State } from '../state';

interface BottomBarProps {
  currentStep: number;
  setStep: (step: number) => void;
  result: State['result'];
  onGenerate: () => void;
  isNextStepEnabled?: boolean;
}

export const BottomBar = React.memo<BottomBarProps>(
  ({ currentStep, setStep, result, onGenerate, isNextStepEnabled = false }) => {
    if (currentStep === 5) {
      return null;
    }

    return (
      <ButtonsFooter isNextDisabled={!isNextStepEnabled} onNext={() => setStep(currentStep + 1)} />
    );
  }
);
BottomBar.displayName = 'BottomBar';
