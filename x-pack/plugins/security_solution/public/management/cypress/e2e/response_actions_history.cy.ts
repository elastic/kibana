/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { login, loginWithRole, ROLE } from '../tasks/login';
import { runEndpointLoaderScript } from '../tasks/run_endpoint_loader';
import { setupLicense } from '../tasks/license';
import { licenses } from '../fixtures/licenses';

const loginWithReadAccess = (url: string) => {
  loginWithRole(ROLE.t2_analyst);
  cy.visit(url);
};

describe('Response actions history page', () => {
  before(() => {
    runEndpointLoaderScript();
  });

  beforeEach(() => {
    login();
  });

  describe('Basic license', () => {
    before(() => {
      setupLicense();
    });

    it('should not show the response actions history nav link', () => {
      loginWithReadAccess('/app/security/administration/manage');
      cy.contains('Response actions history').should('not.exist');
    });

    it('shows the privilege required callout on the response actions history link', () => {
      loginWithReadAccess('/app/security/administration/response_actions_history');
      cy.getBySel('header-page-title').should('not.exist');
      cy.getBySel('noPrivilegesPage').should('exist');
    });
  });

  describe('Enterprise license', () => {
    before(() => {
      setupLicense(licenses.enterprise);
    });
    it('should show the response actions history nav link', () => {
      loginWithReadAccess('/app/security/administration/manage');
      cy.contains('Response actions history').should('exist');
    });

    it('loads the response actions history page', () => {
      loginWithReadAccess('/app/security/administration/response_actions_history');
      cy.contains('Response actions history').should('exist');
    });
  });
});
