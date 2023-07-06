/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC } from 'react';
import { i18n } from '@kbn/i18n';

import { EuiButton, EuiButtonEmpty, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { AddInferencePipelineSteps } from '../types';
import { BACK_BUTTON_LABEL, CANCEL_BUTTON_LABEL, CONTINUE_BUTTON_LABEL } from '../constants';

interface Props {
  isConfigureStepValid: boolean;
  isPipelineDataValid: boolean;
  pipelineCreated: boolean;
  creatingPipeline: boolean;
  step: AddInferencePipelineSteps;
  onClose: () => void;
  onCreate: () => void;
  setStep: React.Dispatch<React.SetStateAction<AddInferencePipelineSteps>>;
}

export const AddInferencePipelineFooter: FC<Props> = ({
  isConfigureStepValid,
  isPipelineDataValid,
  creatingPipeline,
  pipelineCreated,
  onClose,
  onCreate,
  step,
  setStep,
}) => {
  let nextStep: AddInferencePipelineSteps | undefined;
  let previousStep: AddInferencePipelineSteps | undefined;
  let isContinueButtonEnabled = false;

  switch (step) {
    case AddInferencePipelineSteps.Configuration:
      nextStep = AddInferencePipelineSteps.Advanced;
      isContinueButtonEnabled = isConfigureStepValid;
      break;
    case AddInferencePipelineSteps.Advanced:
      nextStep = AddInferencePipelineSteps.Test;
      previousStep = AddInferencePipelineSteps.Configuration;
      isContinueButtonEnabled = isPipelineDataValid;
      break;
    case AddInferencePipelineSteps.Test:
      nextStep = AddInferencePipelineSteps.Create;
      previousStep = AddInferencePipelineSteps.Advanced;
      isContinueButtonEnabled = true;
      break;
    case AddInferencePipelineSteps.Create:
      previousStep = AddInferencePipelineSteps.Test;
      isContinueButtonEnabled = true;
      break;
  }

  return (
    <EuiFlexGroup>
      <EuiFlexItem grow={false}>
        <EuiButtonEmpty onClick={onClose}>{CANCEL_BUTTON_LABEL}</EuiButtonEmpty>
      </EuiFlexItem>
      <EuiFlexItem />
      <EuiFlexItem grow={false}>
        {previousStep !== undefined ? (
          <EuiButtonEmpty
            flush="both"
            iconType="arrowLeft"
            onClick={() => setStep(previousStep as AddInferencePipelineSteps)}
          >
            {BACK_BUTTON_LABEL}
          </EuiButtonEmpty>
        ) : null}
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        {nextStep !== undefined ? (
          <EuiButton
            iconType="arrowRight"
            iconSide="right"
            onClick={() => setStep(nextStep as AddInferencePipelineSteps)}
            disabled={!isContinueButtonEnabled}
            fill
          >
            {CONTINUE_BUTTON_LABEL}
          </EuiButton>
        ) : (
          <EuiButton
            color="success"
            disabled={!isContinueButtonEnabled || creatingPipeline || pipelineCreated}
            fill
            onClick={onCreate}
            isLoading={creatingPipeline}
          >
            {i18n.translate(
              'xpack.ml.trainedModels.content.indices.addInferencePipelineModal.footer.create',
              {
                defaultMessage: 'Create pipeline',
              }
            )}
          </EuiButton>
        )}
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
