/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiLoadingSpinner, EuiPanel } from '@elastic/eui';
import React from 'react';
import type { State } from '../../state';
import { StepContentWrapper } from '../step_content_wrapper';
import * as i18n from './translations';
import { CelConfigResults } from './cel_config_results';

interface ReviewCelStepProps {
  celInputResult: State['celInputResult'];
  isGenerating: State['isGenerating'];
}

export const ReviewCelStep = React.memo<ReviewCelStepProps>(({ isGenerating, celInputResult }) => {
  return (
    <StepContentWrapper title={i18n.TITLE} subtitle={i18n.DESCRIPTION}>
      <EuiPanel hasShadow={false} hasBorder data-test-subj="reviewCelStep">
        {isGenerating ? (
          <EuiLoadingSpinner size="l" />
        ) : (
          <>
            <CelConfigResults celInputResult={celInputResult} />
          </>
        )}
      </EuiPanel>
    </StepContentWrapper>
  );
});
ReviewCelStep.displayName = 'ReviewCelStep';
