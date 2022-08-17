/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { synthtrace } from '../../../../synthtrace';
import { opbeans } from '../../../fixtures/synthtrace/opbeans';

const start = '2021-10-10T00:00:00.000Z';
const end = '2021-10-10T00:15:00.000Z';
describe.skip('Comparison feature flag', () => {
  before(async () => {
    await synthtrace.index(
      opbeans({
        from: new Date(start).getTime(),
        to: new Date(end).getTime(),
      })
    );
  });

  after(async () => {
    await synthtrace.clean();
  });

  describe('when comparison feature is enabled', () => {
    beforeEach(() => {
      cy.loginAsEditorUser();
    });

    it('shows the comparison feature enabled in services overview', () => {
      cy.visit('/app/apm/services');
      cy.get('input[type="checkbox"]#comparison').should('be.checked');
      cy.get('[data-test-subj="comparisonSelect"]').should('not.be.disabled');
    });

    it('shows the comparison feature enabled in services overview', () => {
      cy.visit('/app/apm/dependencies');
      cy.get('input[type="checkbox"]#comparison').should('be.checked');
      cy.get('[data-test-subj="comparisonSelect"]').should('not.be.disabled');
    });

    it('shows the comparison feature disabled in service map overview page', () => {
      cy.visit('/app/apm/service-map');
      cy.get('input[type="checkbox"]#comparison').should('be.checked');
      cy.get('[data-test-subj="comparisonSelect"]').should('not.be.disabled');
    });
  });

  describe('when comparison feature is disabled', () => {
    beforeEach(() => {
      cy.loginAsEditorUser().then(() => {
        // Disables comparison feature on advanced settings
        cy.updateAdvancedSettings({
          'observability:enableComparisonByDefault': false,
        });
      });
    });

    after(() => {
      cy.updateAdvancedSettings({
        'observability:enableComparisonByDefault': true,
      });
    });

    it('shows the comparison feature disabled in services overview', () => {
      cy.visit('/app/apm/services');
      cy.get('input[type="checkbox"]#comparison').should('not.be.checked');
      cy.get('[data-test-subj="comparisonSelect"]').should('be.disabled');
    });

    it('shows the comparison feature disabled in dependencies overview page', () => {
      cy.intercept('GET', '/internal/apm/dependencies/top_dependencies?*').as(
        'topDependenciesRequest'
      );
      cy.visit('/app/apm/dependencies');
      cy.wait('@topDependenciesRequest', { requestTimeout: 10000 });
      cy.get('input[type="checkbox"]#comparison').should('not.be.checked');
      cy.get('[data-test-subj="comparisonSelect"]').should('be.disabled');
    });

    it('shows the comparison feature disabled in service map overview page', () => {
      cy.visit('/app/apm/service-map');
      cy.get('input[type="checkbox"]#comparison').should('not.be.checked');
      cy.get('[data-test-subj="comparisonSelect"]').should('be.disabled');
    });
  });
});
