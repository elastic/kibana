/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { login, visit } from '../../tasks/login';
import { completeTour, goToNextStep, skipTour } from '../../tasks/guided_onboarding';
import { OVERVIEW_URL } from '../../urls/navigation';
import {
  WELCOME_STEP,
  MANAGE_STEP,
  ALERTS_STEP,
  CASES_STEP,
  DATA_STEP,
} from '../../screens/guided_onboarding';

before(() => {
  login();
});

// need to redo these tests for new implementation
describe.skip('Guided onboarding tour', () => {
  describe('Tour is enabled', () => {
    beforeEach(() => {
      visit(OVERVIEW_URL);
    });

    it('can be completed', () => {
      // Step 1: Overview
      cy.get(WELCOME_STEP).should('be.visible');
      goToNextStep(WELCOME_STEP);

      // Step 2: Manage
      cy.get(MANAGE_STEP).should('be.visible');
      goToNextStep(MANAGE_STEP);

      // Step 3: Alerts
      cy.get(ALERTS_STEP).should('be.visible');
      goToNextStep(ALERTS_STEP);

      // Step 4: Cases
      cy.get(CASES_STEP).should('be.visible');
      goToNextStep(CASES_STEP);

      // Step 5: Add data
      cy.get(DATA_STEP).should('be.visible');
      completeTour();
    });

    it('can be skipped', () => {
      cy.get(WELCOME_STEP).should('be.visible');

      skipTour();
      // step 1 is not displayed
      cy.get(WELCOME_STEP).should('not.exist');
      // step 2 is not displayed
      cy.get(MANAGE_STEP).should('not.exist');
    });
  });
});
