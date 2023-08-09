/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, memo } from 'react';
import { i18n } from '@kbn/i18n';

import { EuiStepsHorizontal, EuiStepsHorizontalProps } from '@elastic/eui';
import type { AddInferencePipelineSteps } from '../types';
import { ADD_INFERENCE_PIPELINE_STEPS } from '../constants';

const steps = Object.values(ADD_INFERENCE_PIPELINE_STEPS);

interface Props {
  step: AddInferencePipelineSteps;
  setStep: React.Dispatch<React.SetStateAction<AddInferencePipelineSteps>>;
  isDetailsStepValid: boolean;
  isConfigureProcessorStepValid: boolean;
}

export const AddInferencePipelineHorizontalSteps: FC<Props> = memo(
  ({ step, setStep, isDetailsStepValid, isConfigureProcessorStepValid }) => {
    const currentStepIndex = steps.findIndex((s) => s === step);
    const navSteps: EuiStepsHorizontalProps['steps'] = [
      {
        // Details
        onClick: () => setStep(ADD_INFERENCE_PIPELINE_STEPS.DETAILS),
        status: isDetailsStepValid ? 'complete' : 'incomplete',
        title: i18n.translate(
          'xpack.ml.inferencePipeline.content.indices.transforms.addInferencePipelineModal.steps.details.title',
          {
            defaultMessage: 'Details',
          }
        ),
      },
      {
        // Processor configuration
        onClick: () => {
          if (!isDetailsStepValid) return;
          setStep(ADD_INFERENCE_PIPELINE_STEPS.CONFIGURE_PROCESSOR);
        },
        status:
          isDetailsStepValid && isConfigureProcessorStepValid && currentStepIndex > 1
            ? 'complete'
            : 'incomplete',
        title: i18n.translate(
          'xpack.ml.inferencePipeline.content.indices.transforms.addInferencePipelineModal.steps.configureProcessor.title',
          {
            defaultMessage: 'Configure processor',
          }
        ),
      },
      {
        // handle failures
        onClick: () => {
          if (!isDetailsStepValid) return;
          setStep(ADD_INFERENCE_PIPELINE_STEPS.ON_FAILURE);
        },
        status: currentStepIndex > 2 ? 'complete' : 'incomplete',
        title: i18n.translate(
          'xpack.ml.inferencePipeline.content.indices.transforms.addInferencePipelineModal.steps.handleFailures.title',
          {
            defaultMessage: 'Handle failures',
          }
        ),
      },
      {
        // Test
        onClick: () => {
          if (!isConfigureProcessorStepValid || !isDetailsStepValid) return;
          setStep(ADD_INFERENCE_PIPELINE_STEPS.TEST);
        },
        status: currentStepIndex > 3 ? 'complete' : 'incomplete',
        title: i18n.translate(
          'xpack.ml.trainedModels.content.indices.transforms.addInferencePipelineModal.steps.test.title',
          {
            defaultMessage: 'Test (Optional)',
          }
        ),
      },
      {
        // Review and Create
        onClick: () => {
          if (!isConfigureProcessorStepValid) return;
          setStep(ADD_INFERENCE_PIPELINE_STEPS.CREATE);
        },
        status: isDetailsStepValid && isConfigureProcessorStepValid ? 'incomplete' : 'disabled',
        title: i18n.translate(
          'xpack.ml.inferencePipeline.content.indices.transforms.addInferencePipelineModal.steps.create.title',
          {
            defaultMessage: 'Create',
          }
        ),
      },
    ];
    switch (step) {
      case ADD_INFERENCE_PIPELINE_STEPS.DETAILS:
        navSteps[0].status = 'current';
        break;
      case ADD_INFERENCE_PIPELINE_STEPS.CONFIGURE_PROCESSOR:
        navSteps[1].status = 'current';
        break;
      case ADD_INFERENCE_PIPELINE_STEPS.ON_FAILURE:
        navSteps[2].status = 'current';
        break;
      case ADD_INFERENCE_PIPELINE_STEPS.TEST:
        navSteps[3].status = 'current';
        break;
      case ADD_INFERENCE_PIPELINE_STEPS.CREATE:
        navSteps[4].status = 'current';
        break;
    }
    return <EuiStepsHorizontal steps={navSteps} />;
  }
);
