/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { login, loginWithRole, ROLE } from '../tasks/login';
import { setupLicense } from '../tasks/license';
import { getEnterpriseLicense, getPlatinumLicense } from '../fixtures/licenses';
import { loadEndpointIfNoneExist } from '../tasks/load_endpoint_data';
import { getEndpointListPath } from '../../common/routing';

const loginWithReadAccess = (url: string) => {
  loginWithRole(ROLE.t2_analyst);
  cy.visit(`/app/security${url}`);
};

describe('Response actions history', () => {
  before(() => {
    login();
  });

  describe('Enterprise license', () => {
    beforeEach(() => {
      setupLicense(getEnterpriseLicense());
    });

    it('should show response actions history nav link', () => {
      loginWithReadAccess('/manage');
      cy.getBySel('nav-link-response_actions_history').should('exist');
    });

    it('should show response actions history page', () => {
      loginWithReadAccess('/administration/response_actions_history');
      cy.getBySel('responseActionsPage').should('exist');
    });
  });

  describe('Platinum license', () => {
    beforeEach(() => {
      setupLicense(getPlatinumLicense());
    });

    it('should not show response actions history nav link', () => {
      loginWithReadAccess('/manage');
      cy.getBySel('nav-link-response_actions_history').should('not.exist');
    });

    it('shows the privilege required callout while accessing response actions history page', () => {
      loginWithReadAccess('/administration/response_actions_history');
      cy.getBySel('noPrivilegesPage').should('exist');
    });

    it('should display response action history for an endpoint', () => {
      loadEndpointIfNoneExist();
      loginWithReadAccess(getEndpointListPath({ name: 'endpointList' }));
      cy.getBySel('hostnameCellLink').first().click();
      cy.getBySel('endpoint-details-flyout-tab-activity_log').should('exist');
    });
  });
});
