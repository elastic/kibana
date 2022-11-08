/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CREATE_PACKAGE_POLICY_SAVE_BTN, SAVE_PACKAGE_CONFIRM } from '../screens/integrations';

import { navigateTo, OSQUERY_INTEGRATION_PAGE } from './navigation';

// TODO: allow adding integration version strings to this
export const addIntegration = (policyId: string) => {
  navigateTo(OSQUERY_INTEGRATION_PAGE, { qs: { policyId } });
  cy.get(CREATE_PACKAGE_POLICY_SAVE_BTN).click();
  cy.get(SAVE_PACKAGE_CONFIRM).click();
  // XXX: there is a race condition between the test going to the ui powered by the agent, and the agent having the integration ready to go
  // so we wait.
  // TODO: actually make this wait til the agent has been updated with the proper integration
  cy.wait(5000);
  return cy.reload();
};
