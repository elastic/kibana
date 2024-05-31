/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { memo } from 'react';
import { i18n } from '@kbn/i18n';

import { EuiStepsHorizontal, type EuiStepsHorizontalProps } from '@elastic/eui';
import type { AddInferencePipelineSteps } from '../ml_inference/types';
import { ADD_INFERENCE_PIPELINE_STEPS } from '../ml_inference/constants';

const steps = Object.values(ADD_INFERENCE_PIPELINE_STEPS);

interface Props {
  step: AddInferencePipelineSteps;
  setStep: (step: AddInferencePipelineSteps) => void;
  isDetailsStepValid: boolean;
  isConfigureProcessorStepValid?: boolean;
  hasProcessorStep: boolean;
  pipelineCreated: boolean;
}

const DISABLED = 'disabled';
const COMPLETE = 'complete';
const INCOMPLETE = 'incomplete';

export const AddInferencePipelineHorizontalSteps: FC<Props> = memo(
  ({
    step,
    setStep,
    isDetailsStepValid,
    isConfigureProcessorStepValid,
    hasProcessorStep,
    pipelineCreated,
  }) => {
    const currentStepIndex = steps.findIndex((s) => s === step);

    const navSteps: EuiStepsHorizontalProps['steps'] = [
      {
        // Details
        onClick: () => {
          if (pipelineCreated) return;
          setStep(ADD_INFERENCE_PIPELINE_STEPS.DETAILS);
        },
        status: isDetailsStepValid ? COMPLETE : INCOMPLETE,
        title: i18n.translate(
          'xpack.ml.inferencePipeline.content.indices.transforms.addInferencePipelineModal.steps.details.title',
          {
            defaultMessage: 'Details',
          }
        ),
      },
      {
        // Handle failures
        onClick: () => {
          if (!isDetailsStepValid || pipelineCreated) return;
          setStep(ADD_INFERENCE_PIPELINE_STEPS.ON_FAILURE);
        },
        status: currentStepIndex > 2 ? COMPLETE : INCOMPLETE,
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
          if (!isConfigureProcessorStepValid || !isDetailsStepValid || pipelineCreated) return;
          setStep(ADD_INFERENCE_PIPELINE_STEPS.TEST);
        },
        status: currentStepIndex > 3 ? COMPLETE : INCOMPLETE,
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
          if (!isConfigureProcessorStepValid || pipelineCreated) return;
          setStep(ADD_INFERENCE_PIPELINE_STEPS.CREATE);
        },
        status: isDetailsStepValid && isConfigureProcessorStepValid ? INCOMPLETE : DISABLED,
        title: i18n.translate(
          'xpack.ml.inferencePipeline.content.indices.transforms.addInferencePipelineModal.steps.create.title',
          {
            defaultMessage: 'Create',
          }
        ),
      },
    ];

    if (hasProcessorStep === true) {
      navSteps.splice(1, 0, {
        // Processor configuration
        onClick: () => {
          if (!isDetailsStepValid || pipelineCreated) return;
          setStep(ADD_INFERENCE_PIPELINE_STEPS.CONFIGURE_PROCESSOR);
        },
        status:
          isDetailsStepValid && isConfigureProcessorStepValid && currentStepIndex > 1
            ? COMPLETE
            : INCOMPLETE,
        title: i18n.translate(
          'xpack.ml.inferencePipeline.content.indices.transforms.addInferencePipelineModal.steps.configureProcessor.title',
          {
            defaultMessage: 'Configure processor',
          }
        ),
      });
    }
    let DETAILS_INDEX: number;
    let CONFIGURE_INDEX: number | undefined;
    let ON_FAILURE_INDEX: number;
    let TEST_INDEX: number;
    let CREATE_INDEX: number;

    if (hasProcessorStep) {
      [DETAILS_INDEX, CONFIGURE_INDEX, ON_FAILURE_INDEX, TEST_INDEX, CREATE_INDEX] = [
        0, 1, 2, 3, 4, 5,
      ];
    } else {
      [DETAILS_INDEX, ON_FAILURE_INDEX, TEST_INDEX, CREATE_INDEX] = [0, 1, 2, 3, 4];
    }

    switch (step) {
      case ADD_INFERENCE_PIPELINE_STEPS.DETAILS:
        navSteps[DETAILS_INDEX].status = 'current';
        break;
      case ADD_INFERENCE_PIPELINE_STEPS.CONFIGURE_PROCESSOR:
        if (CONFIGURE_INDEX !== undefined) {
          navSteps[CONFIGURE_INDEX].status = 'current';
        }
        break;
      case ADD_INFERENCE_PIPELINE_STEPS.ON_FAILURE:
        navSteps[ON_FAILURE_INDEX].status = 'current';
        break;
      case ADD_INFERENCE_PIPELINE_STEPS.TEST:
        navSteps[TEST_INDEX].status = 'current';
        break;
      case ADD_INFERENCE_PIPELINE_STEPS.CREATE:
        navSteps[CREATE_INDEX].status = 'current';
        break;
    }

    return <EuiStepsHorizontal steps={navSteps} size="s" />;
  }
);
