/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AddInferencePipelineSteps } from './types';

export function getSteps(
  step: AddInferencePipelineSteps,
  isConfigureStepValid: boolean,
  isPipelineDataValid: boolean
) {
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

  return { nextStep, previousStep, isContinueButtonEnabled };
}
