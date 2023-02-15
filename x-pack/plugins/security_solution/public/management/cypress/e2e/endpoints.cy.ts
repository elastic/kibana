/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { login } from '../tasks/login';
import { runEndpointLoaderScript } from '../tasks/run_endpoint_loader';

describe('Endpoints page', () => {
  before(() => {
    runEndpointLoaderScript();
    // Necessary to save coverage data
    if (Cypress.env().coverage) {
      login();
      cy.visit('/app/security/administration/manage');
      cy.window().its('__coverage__').should('be.a', 'object');
    }
  });

  beforeEach(() => {
    login();
  });

  it('Loads the endpoints page', () => {
    cy.visit('/app/security/administration/endpoints');
    cy.contains('Hosts running Elastic Defend').should('exist');
    cy.getBySel('hostnameCellLink').first().click();
    cy.visit('/app/security/administration/policy');
    cy.getBySel('policyNameCellLink').first().parent().click();
    cy.wait(2000);
    cy.visit('/app/security/administration/trusted_apps');
    cy.getBySel('trustedAppsListPage-emptyState-addButton').click();
    cy.wait(2000);

    cy.visit('/app/security/administration/event_filters');
    cy.getBySel('EventFiltersListPage-emptyState-addButton').click();
    cy.wait(2000);

    cy.visit('/app/security/administration/host_isolation_exceptions');
    cy.getBySel('hostIsolationExceptionsListPage-emptyState-addButton').click();
    cy.wait(2000);

    cy.visit('/app/security/administration/blocklist');
    cy.getBySel('blocklistPage-emptyState-addButton').click();
    cy.wait(2000);

    cy.visit('/app/security/administration/response_actions_history');
    cy.wait(2000);
  });
});
