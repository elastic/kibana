/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ROLES } from '../../test';
import { login } from '../../tasks/login';

describe('None', () => {
  beforeEach(() => {
    login(ROLES.none);

    cy.visit('/app/home');
  });

  it('should not see osquery in global search', () => {
    cy.getBySel('nav-search-input').type('Osquery');
    cy.get('[title="Osquery • Management"]').should('not.exist');
    cy.get('[title="Osquery Logs • Integration"]').should('not.exist');
    cy.get('[title="Osquery Manager • Integration"]').should('not.exist');
  });

  it('should get 403 forbidded response when trying to GET osquery', () => {
    cy.request({
      url: '/app/osquery/live_queries',
      failOnStatusCode: false,
    }).then((resp) => {
      expect(resp.status).to.eq(403);
    });
    cy.request({
      url: '/app/osquery/saved_queries',
      failOnStatusCode: false,
    }).then((resp) => {
      expect(resp.status).to.eq(403);
    });
    cy.request({
      url: '/app/osquery/packs',
      failOnStatusCode: false,
    }).then((resp) => {
      expect(resp.status).to.eq(403);
    });
  });

  it('should not see osquery in alerts', () => {
    cy.visit('/app/security/alerts');
    cy.getBySel('expand-event').first().click({ force: true });
    cy.getBySel('take-action-dropdown-btn').click();
    cy.getBySel('osquery-action-item').should('not.exist');

    cy.getBySel('osquery-actions-notification').contains('0');
    cy.contains('Osquery Results').click();
    cy.contains('Permission denied').should('exist');
    cy.contains('Error while fetching live queries').should('exist');
  });
});
