/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  CREATE_PACKAGE_POLICY_SAVE_BTN,
  SAVE_PACKAGE_CONFIRM,
} from '../screens/integrations';

import {
  OSQUERY_INTEGRATION_PAGE
} from './navigation'

export const addIntegration = (policyId: string) => {
  cy.visit(OSQUERY_INTEGRATION_PAGE, {qs:{policyId}})
  cy.get(CREATE_PACKAGE_POLICY_SAVE_BTN).click();
  cy.get(SAVE_PACKAGE_CONFIRM).click()
  return cy.reload();
};
