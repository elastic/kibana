/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TOGGLE_NAVIGATION_BTN } from '../screens/navigation';

export const INTEGRATIONS = 'app/integrations#/';
export const FLEET = 'app/fleet/';
export const FLEET_AGENT_POLICIES = 'app/fleet/policies';
export const OSQUERY = 'app/osquery';
export const OLD_OSQUERY_MANAGER = 'app/integrations/detail/osquery_manager-0.7.4/settings';
export const NEW_LIVE_QUERY = 'app/osquery/live_queries/new';
export const OSQUERY_INTEGRATION_PAGE = '/app/fleet/integrations/osquery_manager/add-integration';
export const navigateTo = (page: string, opts?: Partial<Cypress.VisitOptions>) => {
  cy.visit(page, opts);
  cy.contains('Loading Elastic').should('exist');
  cy.contains('Loading Elastic').should('not.exist');

  // There's a security warning toast that seemingly makes ui elements in the bottom right unavailable, so we close it
  cy.get('[data-test-subj="toastCloseButton"]', { timeout: 30000 }).click();
  cy.waitForReact();
};

export const openNavigationFlyout = () => {
  cy.get(TOGGLE_NAVIGATION_BTN).click();
};
