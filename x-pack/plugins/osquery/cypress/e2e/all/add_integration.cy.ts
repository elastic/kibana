/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  FLEET_AGENT_POLICIES,
  navigateTo,
  OLD_OSQUERY_MANAGER,
  OSQUERY,
} from '../../tasks/navigation';
import { addIntegration, closeModalIfVisible, closeToastIfVisible } from '../../tasks/integrations';

import { login } from '../../tasks/login';
import { findAndClickButton, findFormFieldByRowsLabelAndType } from '../../tasks/live_query';
import { ArchiverMethod, runKbnArchiverScript } from '../../tasks/archiver';
import { DEFAULT_POLICY, OSQUERY_POLICY } from '../../screens/fleet';

describe('ALL - Add Integration', () => {
  const integration = 'Osquery Manager';

  before(() => {
    runKbnArchiverScript(ArchiverMethod.LOAD, 'saved_query');
  });

  beforeEach(() => {
    login();
  });

  after(() => {
    runKbnArchiverScript(ArchiverMethod.UNLOAD, 'saved_query');
  });

  it('validate osquery is not available and nav search links to integration', () => {
    cy.visit(OSQUERY);
    cy.contains('Add this integration to run and schedule queries for Elastic Agent.');
    cy.contains('Add Osquery Manager');
    cy.getBySel('nav-search-input').type('Osquery');
    cy.get('[title="Osquery • Management"]').should('exist');
    cy.get('[title="Osquery Logs • Integration"]').should('exist');
    cy.get('[title="Osquery Manager • Integration"]').should('exist').click();
  });

  it.skip('should add the old integration and be able to upgrade it', () => {
    const oldVersion = '0.7.4';

    cy.visit(OLD_OSQUERY_MANAGER);
    addIntegration();
    cy.contains('osquery_manager-1');
    cy.visit('app/fleet/policies');
    cy.contains(/^Default Fleet Server policy$/).click();
    cy.contains('Actions').click();
    cy.contains('View policy').click();
    cy.contains('name: osquery_manager-1');
    cy.contains(`version: ${oldVersion}`);
    cy.get('.euiFlyoutFooter').within(() => {
      cy.contains('Close').click();
    });
    cy.contains(/^Osquery Manager$/).click();
    cy.contains(/^Settings$/).click();
    cy.contains(/^Upgrade to latest version$/).click();
    closeModalIfVisible();
    cy.contains('Updated Osquery Manager and upgraded policies', { timeout: 60000 });
    cy.visit('app/fleet/policies');
    cy.contains(/^Default Fleet Server policy$/).click();
    cy.contains('Actions').click();
    cy.contains('View policy').click();
    cy.contains('name: osquery_manager-1');
    cy.contains(`version: ${oldVersion}`).should('not.exist');
    cy.visit('app/integrations/detail/osquery_manager/policies');
    cy.contains('Loading integration policies').should('exist');
    cy.contains('Loading integration policies').should('not.exist');
    cy.getBySel('integrationPolicyTable')
      .get('.euiTableRow', { timeout: 60000 })
      .should('have.lengthOf.above', 0);
    cy.get('.euiTableCellContent').get('.euiPopover__anchor').get(`[aria-label="Open"]`).click();
    cy.contains(/^Delete integration$/).click();
    closeModalIfVisible();
    cy.contains(/^Deleted integration 'osquery_manager-1'$/);
    cy.contains(/^Settings$/).click();
    cy.contains(/^Uninstall Osquery Manager$/).click();
    closeModalIfVisible();
    cy.contains(/^Successfully uninstalled Osquery Manager$/);
  });

  it('add integration', () => {
    cy.visit(FLEET_AGENT_POLICIES);
    cy.contains(DEFAULT_POLICY).click();
    cy.contains('Add integration').click();
    cy.contains(integration).click();
    addIntegration();
    cy.contains('osquery_manager-');
    closeToastIfVisible();
    cy.visit(OSQUERY);
    cy.contains('Live queries history');
  });

  it(`add integration to ${OSQUERY_POLICY}`, () => {
    cy.visit(FLEET_AGENT_POLICIES);
    cy.contains(OSQUERY_POLICY).click();
    cy.contains('Add integration').click();
    cy.contains(integration).click();
    addIntegration(OSQUERY_POLICY);
    cy.contains('osquery_manager-');
  });

  it('should have integration and packs copied when upgrading integration', () => {
    const packageName = 'osquery_manager';
    const oldVersion = '1.2.0';

    cy.visit(`app/integrations/detail/${packageName}-${oldVersion}/overview`);
    cy.contains('Add Osquery Manager').click();
    cy.contains('Save and continue').click();
    cy.contains('Add Elastic Agent later').click();
    cy.contains('Upgrade');
    cy.contains('Agent policy 1').click();
    cy.get('tr')
      .should('contain', 'osquery_manager-3')
      .and('contain', 'Osquery Manager')
      .and('contain', `v${oldVersion}`);
    cy.contains('Actions').click();
    cy.contains('View policy').click();
    cy.contains('name: osquery_manager-3');
    cy.contains(`version: ${oldVersion}`);
    cy.get('.euiFlyoutFooter').within(() => {
      cy.contains('Close').click();
    });
    navigateTo('app/osquery/packs');
    findAndClickButton('Add pack');
    findFormFieldByRowsLabelAndType('Name', 'Integration');
    findFormFieldByRowsLabelAndType(
      'Scheduled agent policies (optional)',
      'Agent policy 1 {downArrow} {enter}'
    );
    findAndClickButton('Add query');
    cy.react('EuiComboBox', {
      props: { placeholder: 'Search for a query to run, or write a new query below' },
    })
      .click()
      .type('{downArrow} {enter}');
    cy.contains(/^Save$/).click();
    cy.contains(/^Save pack$/).click();
    cy.contains(/^Successfully created "Integration" pack$/).click();
    cy.visit('app/fleet/policies');
    cy.contains('Agent policy 1').click();
    cy.contains('Upgrade').click();
    cy.contains(/^Advanced$/).click();
    cy.contains('"Integration":');
    cy.contains(/^Upgrade integration$/).click();
    cy.contains(/^osquery_manager-3$/).click();
    cy.contains(/^Advanced$/).click();
    cy.contains('"Integration":');
    cy.contains('Cancel').click();
    closeModalIfVisible();
    cy.get('tr')
      .should('contain', 'osquery_manager-3')
      .and('contain', 'Osquery Manager')
      .and('contain', 'v')
      .and('not.contain', `v${oldVersion}`);
    cy.contains('Actions').click();
    cy.contains('View policy').click();
    cy.contains('name: osquery_manager-3');

    // test list of prebuilt queries
    navigateTo('/app/osquery/saved_queries');
    cy.waitForReact();
    cy.react('EuiTableRow').should('have.length.above', 5);
  });
});
