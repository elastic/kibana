/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const getStepStatus = (step: number, currentStep: number) => {
  if (step < 3 && currentStep === 3) {
    return 'disabled';
  }

  if (currentStep === step) {
    return 'current';
  }

  if (currentStep > step) {
    return 'complete';
  }

  return 'disabled';
};
