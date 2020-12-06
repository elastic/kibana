/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EDIT_SUBMIT_BUTTON, KIBANA_LOADING_COMPLETE_INDICATOR } from '../screens/edit_rule';

export const saveEditedRule = () => {
  cy.get(EDIT_SUBMIT_BUTTON).should('exist').click({ force: true });
  cy.get(EDIT_SUBMIT_BUTTON).should('not.exist');
};

export const waitForKibana = () => {
  cy.get(KIBANA_LOADING_COMPLETE_INDICATOR).should('exist');
};
