/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ROLE, login } from '../../tasks/login';
import { NAV_SEARCH_INPUT_OSQUERY_RESULTS } from '../../tasks/navigation';
import { loadRule, cleanupRule } from '../../tasks/api_fixtures';

describe('None', () => {
  beforeEach(() => {
    login(ROLE.none);

    cy.visit('/app/home');
  });

  it('should not see osquery in global search', () => {
    cy.getBySel('nav-search-input').type('Osquery');
    cy.get(`[url="${NAV_SEARCH_INPUT_OSQUERY_RESULTS.MANAGEMENT}"]`).should('not.exist');
    cy.get(`[url="${NAV_SEARCH_INPUT_OSQUERY_RESULTS.LOGS}"]`).should('not.exist');
    cy.get(`[url="${NAV_SEARCH_INPUT_OSQUERY_RESULTS.MANAGER}"]`).should('not.exist');
  });

  it('should get 403 forbidden response when trying to GET osquery', () => {
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

  describe('Detection Engine', () => {
    let ruleId: string;

    before(() => {
      login(ROLE.soc_manager);
      loadRule(true).then((data) => {
        ruleId = data.id;
      });
      cy.visit(`/app/security/alerts`);
      cy.getBySel('expand-event').should('exist');
      login(ROLE.none);
    });

    after(() => {
      cleanupRule(ruleId);
    });

    it('should not see osquery in alerts', () => {
      cy.visit(`/app/security/rules/id/${ruleId}/alerts`);
      cy.getBySel('expand-event').first().click();
      cy.getBySel('take-action-dropdown-btn').click();
      cy.getBySel('securitySolutionDocumentDetailsFlyoutResponseSectionHeader').click();
      cy.getBySel('securitySolutionDocumentDetailsFlyoutResponseButton').click();
      cy.contains('Permission denied').should('exist');
    });
  });
});
