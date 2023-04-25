/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { APP_PATH } from '../../../../common/constants';
import { getEndpointDetailsPath, getEndpointListPath } from '../../common/routing';

export const AGENT_HOSTNAME_CELL = 'hostnameCellLink';
export const AGENT_POLICY_CELL = 'policyNameCellLink';
export const TABLE_ROW_ACTIONS = 'endpointTableRowActions';
export const TABLE_ROW_ACTIONS_MENU = 'tableRowActionsMenuPanel';

export const navigateToEndpointPolicyResponse = (
  endpointAgentId: string
): Cypress.Chainable<Cypress.AUTWindow> => {
  return cy.visit(
    APP_PATH +
      getEndpointDetailsPath({ name: 'endpointPolicyResponse', selected_endpoint: endpointAgentId })
  );
};

export const navigateToEndpointList = (): Cypress.Chainable<Cypress.AUTWindow> => {
  return cy.visit(APP_PATH + getEndpointListPath({ name: 'endpointList' }));
};
