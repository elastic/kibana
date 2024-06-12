/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiLoadingSpinner } from '@elastic/eui';
import React, { useCallback, useMemo } from 'react';
import { ButtonsFooter } from '../../../../common/components/buttons_footer';
import { useNavigate, Page } from '../../../../common/hooks/use_navigate';
import type { State, Actions } from '../state';
import * as i18n from './translations';

// Generation button for Step 3
const AnalyzeButtonText = React.memo<{ isGenerating: boolean }>(({ isGenerating }) => {
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
AnalyzeButtonText.displayName = 'AnalyzeButtonText';

interface BottomBarProps {
  currentStep: State['step'];
  isGenerating: State['isGenerating'];
  setStep: Actions['setStep'];
  onGenerate: () => void;
  isNextStepEnabled?: boolean;
}

export const BottomBar = React.memo<BottomBarProps>(
  ({ currentStep, setStep, onGenerate, isGenerating, isNextStepEnabled = false }) => {
    const navigate = useNavigate();

    const onBack = useCallback(() => {
      if (currentStep === 1) {
        navigate(Page.landing);
      } else {
        setStep(currentStep - 1);
      }
    }, [currentStep, navigate, setStep]);

    const onNext = useCallback(() => {
      if (currentStep === 3) {
        onGenerate();
      } else {
        setStep(currentStep + 1);
      }
    }, [currentStep, onGenerate, setStep]);

    const nextButtonText = useMemo(() => {
      if (currentStep === 3) {
        return <AnalyzeButtonText isGenerating={isGenerating} />;
      }
      if (currentStep === 4) {
        return i18n.ADD_TO_ELASTIC;
      }
    }, [currentStep, isGenerating]);

    if (currentStep === 5) {
      return <ButtonsFooter cancelButtonText={i18n.CLOSE} />;
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
