/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, memo } from 'react';
import { i18n } from '@kbn/i18n';

import { EuiStepsHorizontal, EuiStepsHorizontalProps } from '@elastic/eui';
import { AddInferencePipelineSteps } from '../types';

interface Props {
  step: AddInferencePipelineSteps;
  setStep: React.Dispatch<React.SetStateAction<AddInferencePipelineSteps>>;
  isConfigureStepValid: boolean;
  isPipelineDataValid: boolean;
}

export const AddInferencePipelineHorizontalSteps: FC<Props> = memo(
  ({ step, setStep, isConfigureStepValid, isPipelineDataValid }) => {
    const navSteps: EuiStepsHorizontalProps['steps'] = [
      {
        // Configure
        onClick: () => setStep(AddInferencePipelineSteps.Configuration),
        status: isConfigureStepValid ? 'complete' : 'disabled',
        title: i18n.translate(
          'xpack.ml.inferencePipeline.content.indices.transforms.addInferencePipelineModal.steps.configure.title',
          {
            defaultMessage: 'Configure',
          }
        ),
      },
      {
        // Advanced
        onClick: () => {
          if (!isConfigureStepValid) return;
          setStep(AddInferencePipelineSteps.Advanced);
        },
        status: isConfigureStepValid
          ? isPipelineDataValid
            ? 'complete'
            : 'incomplete'
          : 'disabled',
        title: i18n.translate(
          'xpack.ml.inferencePipeline.content.indices.transforms.addInferencePipelineModal.steps.advanced.title',
          {
            defaultMessage: 'Advanced',
          }
        ),
      },
      {
        // Test
        onClick: () => {
          if (!isPipelineDataValid) return;
          setStep(AddInferencePipelineSteps.Test);
        },
        status: isPipelineDataValid ? 'complete' : 'disabled',
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
          if (!isPipelineDataValid) return;
          setStep(AddInferencePipelineSteps.Create);
        },
        status: isPipelineDataValid ? 'incomplete' : 'disabled',
        title: i18n.translate(
          'xpack.ml.inferencePipeline.content.indices.transforms.addInferencePipelineModal.steps.create.title',
          {
            defaultMessage: 'Create',
          }
        ),
      },
    ];
    switch (step) {
      case AddInferencePipelineSteps.Configuration:
        navSteps[0].status = isConfigureStepValid ? 'complete' : 'current';
        break;
      case AddInferencePipelineSteps.Advanced:
        navSteps[1].status = isPipelineDataValid ? 'complete' : 'current';
        break;
      case AddInferencePipelineSteps.Test:
        navSteps[2].status = 'current';
        break;
      case AddInferencePipelineSteps.Create:
        navSteps[3].status = 'current';
        break;
    }
    return <EuiStepsHorizontal steps={navSteps} />;
  }
);
