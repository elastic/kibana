/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiButtonEmpty, EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { useStepDetailPage } from './hooks/use_step_detail_page';

interface Props {
  stepName: string;
  stepIndex: number;
  totalSteps: number;
  hasPreviousStep: boolean;
  hasNextStep: boolean;
  handlePreviousStepHref: string;
  handleNextStepHref: string;
}

export const StepNumberNav = ({
  stepIndex,
  totalSteps,
  handleNextStepHref,
  handlePreviousStepHref,
  hasNextStep,
  hasPreviousStep,
}: Props) => {
  return (
    <EuiFlexGroup alignItems="center" responsive={false}>
      <EuiFlexItem>
        <EuiFlexGroup alignItems="center" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              href={handlePreviousStepHref}
              disabled={!hasPreviousStep}
              iconType="arrowLeft"
            >
              {PREVIOUS_STEP_BUTTON_TEXT}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiText size="s">
              <FormattedMessage
                id="xpack.synthetics.synthetics.stepDetail.totalSteps"
                defaultMessage="Step {stepIndex} of {totalSteps}"
                values={{
                  stepIndex,
                  totalSteps,
                }}
              />
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              href={handleNextStepHref}
              disabled={!hasNextStep}
              iconType="arrowRight"
              iconSide="right"
            >
              {NEXT_STEP_BUTTON_TEXT}
            </EuiButtonEmpty>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

export const StepDetailPageChildren = () => {
  const {
    activeStep,
    hasPreviousStep,
    hasNextStep,
    handleNextStepHref,
    handlePreviousStepHref,
    journey,
    stepIndex,
  } = useStepDetailPage();

  if (!journey || !activeStep) return null;

  return (
    <StepNumberNav
      stepName={activeStep.synthetics?.step?.name ?? ''}
      stepIndex={stepIndex}
      totalSteps={journey.steps.length}
      hasPreviousStep={hasPreviousStep}
      hasNextStep={hasNextStep}
      handlePreviousStepHref={handlePreviousStepHref}
      handleNextStepHref={handleNextStepHref}
    />
  );
};

export const PREVIOUS_STEP_BUTTON_TEXT = i18n.translate(
  'xpack.synthetics.synthetics.stepDetail.previousStepButtonText',
  {
    defaultMessage: 'Previous',
  }
);

export const NEXT_STEP_BUTTON_TEXT = i18n.translate(
  'xpack.synthetics.synthetics.stepDetail.nextStepButtonText',
  {
    defaultMessage: 'Next',
  }
);
