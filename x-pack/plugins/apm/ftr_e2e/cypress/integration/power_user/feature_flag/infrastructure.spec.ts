/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { synthtrace } from '../../../../synthtrace';
import { opbeans } from '../../../fixtures/synthtrace/opbeans';

const settingsPath = '/app/management/kibana/settings';
const serviceOverviewPath = '/app/apm/services/opbeans-python/overview';

const start = '2021-10-10T00:00:00.000Z';
const end = '2021-10-10T00:15:00.000Z';

describe('Infrastracture feature flag', () => {
  const infraToggle =
    '[data-test-subj="advancedSetting-editField-observability:enableInfrastructureView"]';

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

  describe('when infrastracture feature is enabled', () => {
    it('shows the flag as enabled in kibana advanced settings', () => {
      cy.visit(settingsPath);

      cy.get(infraToggle)
        .should('have.attr', 'aria-checked')
        .and('equal', 'false');
    });

    it('hides infrastructure tab in service overview page', () => {
      cy.visit(serviceOverviewPath);
      cy.contains('a[role="tab"]', 'Infrastructure').should('not.exist');
    });
  });

  describe('when infrastracture feature is disabled', () => {
    it('shows the flag as disabled in kibana advanced settings', () => {
      cy.visit(settingsPath);
      cy.get(infraToggle).click();
      cy.contains('Save changes').should('not.be.disabled');
      cy.contains('Save changes').click();

      cy.get(infraToggle)
        .should('have.attr', 'aria-checked')
        .and('equal', 'true');
    });

    it('shows infrastructure tab in service overview page', () => {
      cy.visit(serviceOverviewPath);
      cy.contains('a[role="tab"]', 'Infrastructure').click();
      cy.contains('Infrastructure data coming soon');
    });
  });
});
