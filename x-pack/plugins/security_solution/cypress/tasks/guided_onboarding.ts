/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  NEXT_STEP_BUTTON,
  END_TOUR_BUTTON,
  DATA_STEP,
  SKIP_TOUR_BUTTON,
} from '../screens/guided_onboarding';

export const goToNextStep = (currentStep: string) => {
  cy.get(`${currentStep} ${NEXT_STEP_BUTTON}`).click();
};

export const completeTour = () => {
  cy.get(`${DATA_STEP} ${END_TOUR_BUTTON}`).click();
};

export const skipTour = () => {
  cy.get(SKIP_TOUR_BUTTON).click();
};
