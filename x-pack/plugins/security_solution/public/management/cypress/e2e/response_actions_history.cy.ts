/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { login, loginWithRole, ROLE } from '../tasks/login';
import { setupLicense } from '../tasks/license';
import { enterprise, platinum } from '../fixtures/licenses';
import { loadEndpointIfNoneExist } from '../tasks/load_endpoint_data';

const loginWithReadAccess = (url: string) => {
  loginWithRole(ROLE.t2_analyst);
  cy.visit(url);
};

describe('Response actions history', () => {
  before(() => {
    login();
  });

  describe('Enterprise license', () => {
    beforeEach(() => {
      setupLicense(enterprise);
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
    beforeEach(() => {
      setupLicense(platinum);
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
      loadEndpointIfNoneExist();
      loginWithReadAccess('/app/security/administration/endpoints');
      cy.getBySel('hostnameCellLink').first().click();
      cy.getBySel('endpoint-details-flyout-tab-activity_log').should('exist');
    });
  });
});
