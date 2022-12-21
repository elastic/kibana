/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EuiStepsHorizontal } from '@elastic/eui';
import type { EuiStepsHorizontalProps } from '@elastic/eui';
import styled from 'styled-components';

// polyfill until https://github.com/elastic/eui/discussions/5836 implemented
const NumberlessHorizontalSteps = styled(EuiStepsHorizontal)`
  .euiStepNumber {
    color: transparent;
    width: 16px;
    height: 16px;
    outline-color: #07c;
  }
  .euiStepHorizontal::before {
    width: calc(50% - 8px);
    top: 32px;
  }
  .euiStepHorizontal::after {
    width: calc(50% - 8px);
    top: 32px;
  }
  .euiStepHorizontal {
    padding: 25px 16px 16px;
  }
  .euiStepHorizontal-isIncomplete .euiStepHorizontal__title {
    color: #69707d;
  }
`;
const getStepStatus = (currentStep: number, stepIndex: number, currentStepComplete: boolean) => {
  if (currentStep === stepIndex) {
    if (currentStepComplete) return 'complete';
    return 'current';
  }

  if (currentStep > stepIndex) {
    return 'complete';
  }

  return 'incomplete';
};

export const PageSteps: React.FC<{
  steps: string[];
  currentStep?: number;
  currentStepComplete?: boolean;
}> = ({ steps: stepTitles, currentStep = 0, currentStepComplete = false }) => {
  const steps = stepTitles.map((title, index) => {
    return {
      title,
      status: getStepStatus(currentStep, index, currentStepComplete),
      onClick: () => {},
    };
  }) as EuiStepsHorizontalProps['steps'];

  return <NumberlessHorizontalSteps steps={steps} />;
};
