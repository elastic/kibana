/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiLoadingSpinner } from '@elastic/eui';
import React, { useCallback, useMemo } from 'react';
import { ButtonsFooter } from '../../../../common/components/buttons_footer';
import type { SetPage } from '../../../types';
import type { State } from '../state';
import * as i18n from './translations';

// Generation button for Step 3
const Step3ButtonText = React.memo<{ isGenerating: boolean }>(({ isGenerating }) => {
  if (!isGenerating) {
    return <>{i18n.ANALYZE_LOGS}</>;
  }
  return (
    <>
      <EuiLoadingSpinner size="s" />
      {i18n.LOADING}
    </>
  );
});
Step3ButtonText.displayName = 'Step3ButtonText';

interface BottomBarProps {
  setPage: SetPage;
  currentStep: number;
  setStep: (step: number) => void;
  result: State['result'];
  onGenerate: () => void;
  isGenerating: boolean;
  isNextStepEnabled?: boolean;
}

export const BottomBar = React.memo<BottomBarProps>(
  ({
    setPage,
    currentStep,
    setStep,
    result,
    onGenerate,
    isGenerating,
    isNextStepEnabled = false,
  }) => {
    const onBack = useCallback(() => {
      if (currentStep === 1) {
        setPage('landing');
      } else {
        setStep(currentStep - 1);
      }
    }, [currentStep, setPage, setStep]);

    const onNext = useCallback(() => {
      if (currentStep === 3) {
        onGenerate();
      } else {
        setStep(currentStep + 1);
      }
    }, [currentStep, onGenerate, setStep]);

    const nextButtonText = useMemo(() => {
      if (currentStep === 3) {
        return <Step3ButtonText isGenerating={isGenerating} />;
      }
      if (currentStep === 4) {
        return i18n.ADD_TO_ELASTIC;
      }
    }, [currentStep, isGenerating]);

    if (currentStep > 4) {
      return null;
    }
    return (
      <ButtonsFooter
        isNextDisabled={!isNextStepEnabled || isGenerating}
        onBack={onBack}
        onNext={onNext}
        nextButtonText={nextButtonText}
      />
    );
  }
);
BottomBar.displayName = 'BottomBar';
