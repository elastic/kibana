/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  BACK_TO_RULE_DETAILS,
  EDIT_SUBMIT_BUTTON,
  KIBANA_LOADING_COMPLETE_INDICATOR,
} from '../screens/edit_rule';

export const saveEditedRule = () => {
  cy.get(EDIT_SUBMIT_BUTTON).should('exist').click({ force: true });
  cy.get(EDIT_SUBMIT_BUTTON).should('not.exist');
};

export const goBackToRuleDetails = () => {
  cy.get(BACK_TO_RULE_DETAILS).should('exist').click();
  cy.get(BACK_TO_RULE_DETAILS).should('not.exist');
};

export const waitForKibana = () => {
  cy.get(KIBANA_LOADING_COMPLETE_INDICATOR).should('exist');
};
