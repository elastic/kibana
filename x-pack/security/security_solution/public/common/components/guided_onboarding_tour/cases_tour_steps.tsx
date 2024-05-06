/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import { AlertsCasesTourSteps, SecurityStepId } from './tour_config';
import { GuidedOnboardingTourStep } from './tour_step';

const getSubmitButton = (): HTMLElement | null =>
  document.querySelector(`[tour-step="create-case-submit"]`);

export const CasesTourSteps = () => {
  const [activeStep, setActiveStep] = useState(AlertsCasesTourSteps.createCase);

  const scrollToSubmitButton = useCallback(() => {
    getSubmitButton()?.scrollIntoView();
  }, []);

  const onClick = useCallback(() => {
    setActiveStep(AlertsCasesTourSteps.submitCase);
    scrollToSubmitButton();
    setTimeout(() => {
      // something is resetting focus to close flyout button
      getSubmitButton()?.focus();
    }, 500);
  }, [scrollToSubmitButton]);

  return (
    <>
      {activeStep === AlertsCasesTourSteps.createCase && (
        <GuidedOnboardingTourStep
          onClick={onClick}
          step={AlertsCasesTourSteps.createCase}
          tourId={SecurityStepId.alertsCases}
        />
      )}
      {activeStep === AlertsCasesTourSteps.submitCase && (
        <GuidedOnboardingTourStep
          step={AlertsCasesTourSteps.submitCase}
          tourId={SecurityStepId.alertsCases}
        />
      )}
    </>
  );
};
