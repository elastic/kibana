/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { UPDATE_PREBUILT_RULES_CALLOUT_BUTTON } from '../screens/alerts_detection_rules';

export const installPrebuiltRulesButtonClick = (buttonSelector: string) => {
  cy.get(buttonSelector).click();
  cy.get(buttonSelector).should('have.attr', 'disabled');
  cy.get(buttonSelector).should('not.exist');
};

export const installPrebuiltRulesButtonClickWithError = (buttonSelector: string) => {
  cy.get(buttonSelector).click();
  cy.get(buttonSelector).should('have.attr', 'disabled');
};

export const updatePrebuiltRulesButtonClick = () => {
  cy.get(UPDATE_PREBUILT_RULES_CALLOUT_BUTTON).click();
  cy.get(UPDATE_PREBUILT_RULES_CALLOUT_BUTTON).should('have.attr', 'disabled');
  cy.get(UPDATE_PREBUILT_RULES_CALLOUT_BUTTON).should('not.exist');
};

export const updatePrebuiltRulesButtonClickWithError = () => {
  cy.get(UPDATE_PREBUILT_RULES_CALLOUT_BUTTON).click();
  cy.get(UPDATE_PREBUILT_RULES_CALLOUT_BUTTON).should('have.attr', 'disabled');
};
