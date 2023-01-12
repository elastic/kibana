/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { login, loginWithRole, ROLE } from '../tasks/login';
import { setupLicense } from '../tasks/license';
import { licenses } from '../fixtures/licenses';
import { runEndpointLoaderScript } from '../tasks/run_endpoint_loader';

const loginWithReadAccess = (url: string) => {
  loginWithRole(ROLE.t2_analyst);
  cy.visit(url);
};

describe('Enterprise license', () => {
  before(() => {
    login();
  });

  beforeEach(() => {
    setupLicense(licenses.enterprise);
  });

  it('should show response actions history nav link', () => {
    loginWithReadAccess('/app/security/manage');
    cy.contains('Response actions history').should('exist');
  });

  it('should show response actions history page', () => {
    loginWithReadAccess('/app/security/administration/response_actions_history');
    cy.getBySel('responseActionsPage').should('exist');
  });
});

describe('Platinum license', () => {
  before(() => {
    login();
  });

  beforeEach(() => {
    setupLicense(licenses.platinum);
  });

  it('should not show response actions history nav link', () => {
    loginWithReadAccess('/app/security/manage');
    cy.contains('Response actions history').should('not.exist');
  });

  it('shows the privilege required callout while accessing response actions history page', () => {
    loginWithReadAccess('/app/security/administration/response_actions_history');
    cy.get("[data-test-subj='noPrivilegesPage']").should('exist');
  });

  it('should display response action history for an endpoint', () => {
    runEndpointLoaderScript();
    loginWithReadAccess('/app/security/administration/endpoints');
    cy.getBySel('hostnameCellLink').first().click();
    cy.getBySel('endpoint-details-flyout-tab-activity_log').should('exist');
  });
});
