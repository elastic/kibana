/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { login, loginWithRole, ROLE } from '../tasks/login';
import { setupLicense } from '../tasks/license';
import { licenses } from '../fixtures/licenses';
import { loadEndpointIfNoneExist } from '../tasks/common/load_endpoint_data';

const loginWithWriteAccess = (url: string) => {
  loginWithRole(ROLE.analyst_hunter);
  cy.visit(url);
};

describe('Endpoint list', () => {
  before(() => {
    login();
    loadEndpointIfNoneExist();
  });

  it('Loads the endpoints page', () => {
    cy.visit('/app/security/administration/endpoints');
    cy.contains('Hosts running Elastic Defend').should('exist');
  });

  describe('Platinum license', () => {
    beforeEach(() => {
      setupLicense(licenses.platinum);
    });

    it('should display isolate action item for an endpoint', () => {
      loginWithWriteAccess('/app/security/administration/endpoints');
      cy.getBySel('endpointTableRowActions').first().click();
      cy.getBySel('isolateLink').should('exist');
    });

    it('should display isolate action item for an endpoint on details flyout', () => {
      loginWithWriteAccess('/app/security/administration/endpoints');
      cy.getBySel('hostnameCellLink').first().click();
      cy.getBySel('endpointDetailsActionsButton').click();
      cy.getBySel('isolateLink').should('exist');
    });
  });

  describe('Gold license', () => {
    beforeEach(() => {
      setupLicense(licenses.gold);
    });

    it('should not display isolate action item for an endpoint', () => {
      loginWithWriteAccess('/app/security/administration/endpoints');
      cy.getBySel('endpointTableRowActions').first().click();
      cy.getBySel('isolateLink').should('not.exist');
    });

    it('should not display isolate action item for an endpoint on details flyout', () => {
      loginWithWriteAccess('/app/security/administration/endpoints');
      cy.getBySel('hostnameCellLink').first().click();
      cy.getBySel('endpointDetailsActionsButton').click();
      cy.getBySel('isolateLink').should('not.exist');
    });
  });
});
