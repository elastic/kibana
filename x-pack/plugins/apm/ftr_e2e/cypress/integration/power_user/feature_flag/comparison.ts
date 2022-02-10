/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { synthtrace } from '../../../../synthtrace';
import { opbeans } from '../../../fixtures/synthtrace/opbeans';

const settingsPath = '/app/management/kibana/settings';

const start = '2021-10-10T00:00:00.000Z';
const end = '2021-10-10T00:15:00.000Z';
describe('Comparison feature flag', () => {
  const comparisonToggle =
    '[data-test-subj="advancedSetting-editField-observability:enableComparisonByDefault"]';

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

  beforeEach(() => {
    cy.loginAsPowerUser();
  });

  describe('when comparison feature is enabled', () => {
    it('shows the flag as enabled in kibana advanced settings', () => {
      cy.visit(settingsPath);

      cy.get(comparisonToggle)
        .should('have.attr', 'aria-checked')
        .and('equal', 'true');
    });

    it('shows the comparison feature enabled in services overview', () => {
      cy.visit('/app/apm/services');
      cy.get('input[type="checkbox"]#comparison').should('be.checked');
      cy.get('[data-test-subj="comparisonSelect"]').should('not.be.disabled');
    });

    it('shows the comparison feature enabled in services overview', () => {
      cy.visit('/app/apm/backends');
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
    it('shows the flag as disabled in kibana advanced settings', () => {
      cy.visit(settingsPath);
      cy.get(comparisonToggle).click();
      cy.contains('Save changes').should('not.be.disabled');
      cy.contains('Save changes').click();
      cy.get(comparisonToggle).should('not.be.checked');

      cy.get(comparisonToggle)
        .should('have.attr', 'aria-checked')
        .and('equal', 'false');
    });

    it('shows the comparison feature disabled in services overview', () => {
      cy.visit('/app/apm/services');
      cy.get('input[type="checkbox"]#comparison').should('not.be.checked');
      cy.get('[data-test-subj="comparisonSelect"]').should('be.disabled');
    });

    it('shows the comparison feature disabled in dependencies overview page', () => {
      cy.visit('/app/apm/backends');
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
