/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { login, loginWithRole, ROLE } from '../tasks/login';
import { setupLicense } from '../tasks/license';
import { platinum, gold } from '../fixtures/licenses';
import { getHieListResponse } from '../fixtures/exception_list_entries';

const loginWithReadAccess = (url: string) => {
  loginWithRole(ROLE.t2_analyst);
  cy.visit(url);
};

const loginWithWriteAccess = (url: string) => {
  loginWithRole(ROLE.analyst_hunter);
  cy.visit(url);
};

const stubHIEResponse = ({ isEmpty }: { isEmpty: boolean }) => {
  cy.intercept('GET', `/api/exception_lists/items/_find?*`, {
    statusCode: 200,
    body: getHieListResponse(isEmpty),
  }).as('getHIEEntry');
};

const hiePagePrefix = 'hostIsolationExceptionsListPage';

describe('Host isolation exceptions', () => {
  before(() => {
    login();
  });

  describe('Platinum license', () => {
    beforeEach(() => {
      setupLicense(platinum);
      stubHIEResponse({ isEmpty: true });
    });

    it('should show host isolation exception nav link', () => {
      loginWithReadAccess('/app/security/manage');
      cy.getBySel('nav-link-host_isolation_exceptions').should('exist');
    });

    it('should show host isolation exceptions page', () => {
      loginWithReadAccess('/app/security/administration/host_isolation_exceptions');
      cy.getBySel(`${hiePagePrefix}-container`).should('exist');
      cy.getBySel(`${hiePagePrefix}-emptyState`).should('exist');
    });
  });

  describe('Gold license', () => {
    beforeEach(() => {
      setupLicense(gold);
    });

    describe('Without any HIE entries', () => {
      beforeEach(() => {
        stubHIEResponse({ isEmpty: true });
      });

      it('should not show host isolation exceptions nav link', () => {
        loginWithReadAccess('/app/security/manage');
        cy.getBySel('nav-link-host_isolation_exceptions').should('not.exist');
      });

      it('shows the privilege required callout while accessing host isolation exceptions page', () => {
        loginWithReadAccess('/app/security/administration/host_isolation_exceptions');
        cy.getBySel('noPrivilegesPage').should('exist');
      });
    });

    describe('With an HIE entry', () => {
      beforeEach(() => {
        stubHIEResponse({ isEmpty: false });
      });

      it('should show host isolation exception page if an entry exists', () => {
        loginWithReadAccess('/app/security/administration/host_isolation_exceptions');
        cy.getBySel(`${hiePagePrefix}-card`).should('exist');
      });

      it('should allow only delete action on HIE entry', () => {
        loginWithWriteAccess('/app/security/administration/host_isolation_exceptions');
        cy.getBySel(`${hiePagePrefix}-card`).should('exist');
        cy.getBySel(`${hiePagePrefix}-card-header-actions-button`).click();
        const actions = cy
          .getBySel(`${hiePagePrefix}-card-header-actions-contextMenuPanel`)
          .find('button');
        actions.should('have.length', 1);
        actions.contains('Delete exception');
      });
    });
  });
});
