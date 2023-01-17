/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { login, loginWithRole, ROLE } from '../tasks/login';
import { setupLicense } from '../tasks/license';
import { enterprise, platinum } from '../fixtures/licenses';
import { loadEndpointIfNoneExist } from '../tasks/common/load_endpoint_data';

const loginWithWriteAccess = (url: string) => {
  loginWithRole(ROLE.analyst_hunter);
  cy.visit(url);
};

describe('Responder', () => {
  before(() => {
    login();
    loadEndpointIfNoneExist();
  });

  describe('Enterprise license', () => {
    beforeEach(() => {
      setupLicense(enterprise);
    });

    it('should display responder action item for an endpoint', () => {
      loginWithWriteAccess('/app/security/administration/endpoints');
      cy.getBySel('endpointTableRowActions').first().click();
      cy.getBySel('console').should('exist');
    });
  });

  describe('Platinum license', () => {
    beforeEach(() => {
      setupLicense(platinum);
    });

    it('should not display responder action item for an endpoint', () => {
      loginWithWriteAccess('/app/security/administration/endpoints');
      cy.getBySel('endpointTableRowActions').first().click();
      cy.getBySel('console').should('not.exist');
    });
  });
});
