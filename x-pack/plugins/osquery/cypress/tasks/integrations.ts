/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ADD_POLICY_BTN,
  CREATE_PACKAGE_POLICY_SAVE_BTN,
  INTEGRATIONS_CARD,
} from '../screens/integrations';

export const addIntegration = (integration: string) => {
  cy.get(INTEGRATIONS_CARD).contains(integration).click();
  cy.get(ADD_POLICY_BTN).click();
  cy.get(CREATE_PACKAGE_POLICY_SAVE_BTN).click();
  cy.get(CREATE_PACKAGE_POLICY_SAVE_BTN).should('not.exist');
  cy.reload();
};
