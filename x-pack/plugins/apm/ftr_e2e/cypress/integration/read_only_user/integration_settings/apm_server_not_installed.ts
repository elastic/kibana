/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

describe('when navigating to the integrations browse page', () => {
  beforeEach(() => {
    const integrationsPath = '/app/integrations/browse';
    cy.loginAsReadOnlyUser();
    cy.visit(integrationsPath);
  });

  it('should display Elastic APM integration option', () => {
    cy.get('[data-test-subj="integration-card:epr:apm:featured').should(
      'exist'
    );
    cy.contains('Elastic APM');
  });

  describe('when clicking on the Elastic APM option but Fleet is not installed', () => {
    it('should not have the rights to add APM integration', () => {
      cy.get('[data-test-subj="integration-card:epr:apm:featured').click();
      cy.get('[aria-selected="true"]').contains('Elastic APM in Fleet');
      cy.contains('Elastic APM now available in Fleet!');
      cy.contains('a', 'APM integration').click();
      cy.url().should('include', 'app/integrations/detail/apm/overview');
      cy.get('[data-test-subj="addIntegrationPolicyButton"]').should(
        'be.disabled'
      );
    });

    it('should display no APM server detected when checking the apm server status', () => {
      cy.intercept('POST', '/api/home/hits_status', {
        count: 0,
      }).as('hitsStatus');

      cy.get('[data-test-subj="integration-card:epr:apm:featured').click();
      cy.contains('Check APM Server status').click();
      cy.wait('@hitsStatus');
      cy.contains(
        'No APM Server detected. Please make sure it is running and you have updated to 7.0 or higher.'
      );
    });

    it('should display no APM server detected when checking the apm server status', () => {
      cy.intercept('POST', '/api/home/hits_status', {
        count: 0,
      }).as('hitsStatus');

      cy.get('[data-test-subj="integration-card:epr:apm:featured').click();
      cy.contains('Check APM Server status').click();
      cy.wait('@hitsStatus');
      cy.contains(
        'No APM Server detected. Please make sure it is running and you have updated to 7.0 or higher.'
      );
    });
  });
});
