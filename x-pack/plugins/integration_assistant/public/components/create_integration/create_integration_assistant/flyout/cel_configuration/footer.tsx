/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
} from '@elastic/eui';
import React, { useMemo } from 'react';
import { type State } from '../../state';
import * as i18n from './translations';
import type { CelFlyoutStepName } from './create_cel_config';

const AnalyzeApiButtonText = React.memo<{ isGenerating: boolean }>(({ isGenerating }) => {
  if (!isGenerating) {
    return <>{i18n.ANALYZE}</>;
  }
  return (
    <>
      <EuiLoadingSpinner size="s" data-test-subj="generatingLoader" />
      {i18n.LOADING}
    </>
  );
});
AnalyzeApiButtonText.displayName = 'AnalyzeApiButtonText';

const AnalyzeCelButtonText = React.memo<{ isGenerating: boolean }>(({ isGenerating }) => {
  if (!isGenerating) {
    return <>{i18n.SAVE_AND_CONTINUE}</>;
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
  isFlyoutGenerating?: State['isFlyoutGenerating'];
  celStep: CelFlyoutStepName;
  isNextStepEnabled?: boolean;
  onNext?: () => void;
  onClose?: () => void;
}

export const Footer = React.memo<FooterProps>(
  ({
    isFlyoutGenerating = false,
    celStep,
    isNextStepEnabled = false,
    onNext = () => {},
    onClose = () => {},
  }) => {
    const nextButtonText = useMemo(() => {
      if (celStep === 'upload_spec') {
        return <AnalyzeApiButtonText isGenerating={isFlyoutGenerating} />;
      }
      if (celStep === 'confirm_details') {
        return <AnalyzeCelButtonText isGenerating={isFlyoutGenerating} />;
      }
    }, [celStep, isFlyoutGenerating]);

    return (
      <EuiFlexGroup justifyContent="spaceBetween">
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty onClick={onClose} flush="left" data-test-subj="buttonsFooter-nextButton">
            {i18n.CLOSE}
          </EuiButtonEmpty>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButton
            fill
            color="primary"
            onClick={onNext}
            isDisabled={!isNextStepEnabled}
            data-test-subj="buttonsFooter-nextButton"
          >
            {nextButtonText}
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }
);
Footer.displayName = 'Footer';
