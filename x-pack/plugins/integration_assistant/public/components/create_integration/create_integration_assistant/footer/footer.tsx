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
import { useTelemetry } from '../../telemetry';
import { useActions, type State } from '../state';
import * as i18n from './translations';
import { ExperimentalFeaturesService } from '../../../../services';

// Generation button for Step 3
const AnalyzeButtonText = React.memo<{ isGenerating: boolean }>(({ isGenerating }) => {
  if (!isGenerating) {
    return <>{i18n.ANALYZE_LOGS}</>;
  }
  return (
    <>
      <EuiLoadingSpinner size="s" data-test-subj="generatingLoader" />
      {i18n.LOADING}
    </>
  );
});
AnalyzeButtonText.displayName = 'AnalyzeButtonText';

// Generation button for Step 5
const AnalyzeCelButtonText = React.memo<{ isGenerating: boolean }>(({ isGenerating }) => {
  if (!isGenerating) {
    return <>{i18n.ANALYZE_CEL}</>;
  }
  return (
    <>
      <EuiLoadingSpinner size="s" data-test-subj="generatingLoader" />
      {i18n.LOADING}
    </>
  );
});
AnalyzeCelButtonText.displayName = 'AnalyzeCelButtonText';

interface FooterProps {
  currentStep: State['step'];
  isGenerating: State['isGenerating'];
  isNextStepEnabled?: boolean;
}

export const Footer = React.memo<FooterProps>(
  ({ currentStep, isGenerating, isNextStepEnabled = false }) => {
    const telemetry = useTelemetry();
    const { setStep, setIsGenerating } = useActions();
    const navigate = useNavigate();

    const { generateCel: isGenerateCelEnabled } = ExperimentalFeaturesService.get();

    const onBack = useCallback(() => {
      if (currentStep === 1) {
        navigate(Page.landing);
      } else {
        setStep(currentStep - 1);
      }
    }, [currentStep, navigate, setStep]);

    const onNext = useCallback(() => {
      telemetry.reportAssistantStepComplete({ step: currentStep });
      if (currentStep === 3 || currentStep === 5) {
        setIsGenerating(true);
      } else {
        setStep(currentStep + 1);
      }
    }, [currentStep, setIsGenerating, setStep, telemetry]);

    const nextButtonText = useMemo(() => {
      if (currentStep === 3) {
        return <AnalyzeButtonText isGenerating={isGenerating} />;
      }
      if (currentStep === 4 && !isGenerateCelEnabled) {
        return i18n.ADD_TO_ELASTIC;
      }
      if (currentStep === 5 && isGenerateCelEnabled) {
        return <AnalyzeCelButtonText isGenerating={isGenerating} />;
      }
      if (currentStep === 6 && isGenerateCelEnabled) {
        return i18n.ADD_TO_ELASTIC;
      }
    }, [currentStep, isGenerating, isGenerateCelEnabled]);

    if (currentStep === 7 || (currentStep === 5 && !isGenerateCelEnabled)) {
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
Footer.displayName = 'Footer';
