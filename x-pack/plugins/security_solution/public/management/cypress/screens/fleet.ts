/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FLEET_BASE_PATH } from '@kbn/fleet-plugin/public/constants';

export const FLEET_REASSIGN_POLICY_MODAL = 'agentReassignPolicyModal';
export const FLEET_REASSIGN_POLICY_MODAL_CONFIRM_BUTTON = 'confirmModalConfirmButton';

export const navigateToFleetAgentDetails = (
  agentId: string
): Cypress.Chainable<Cypress.AUTWindow> => {
  // FYI: attempted to use fleet's `pagePathGetters()`, but got compile
  // errors due to it pulling too many modules
  const response = cy.visit(`${FLEET_BASE_PATH}/agents/${agentId}`);

  cy.getByTestSubj('agentPolicyNameLink').should('be.visible');

  return response;
};
