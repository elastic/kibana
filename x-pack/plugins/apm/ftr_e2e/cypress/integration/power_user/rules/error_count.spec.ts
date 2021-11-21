/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

function deleteAllRules() {
  cy.request({
    log: false,
    method: 'GET',
    url: '/api/alerting/rules/_find',
  }).then(({ body }) => {
    if (body.data.length > 0) {
      cy.log(`Deleting rules`);
    }

    body.data.map(({ id }: { id: string }) => {
      cy.request({
        headers: { 'kbn-xsrf': 'true' },
        log: false,
        method: 'DELETE',
        url: `/api/alerting/rule/${id}`,
      });
    });
  });
}

describe('Rules', () => {
  describe('Error count', () => {
    const ruleName = 'Error count threshold';
    const comboBoxInputSelector =
      '.euiPopover__panel-isOpen [data-test-subj=comboBoxSearchInput]';
    const confirmModalButtonSelector =
      '.euiModal button[data-test-subj=confirmModalConfirmButton]';

    describe('when created from APM', () => {
      describe('when created from Service Inventory', () => {
        before(() => {
          cy.loginAsPowerUser();
          deleteAllRules();
        });

        after(() => {
          deleteAllRules();
        });

        it('creates a rule', () => {
          // Create a rule in APM
          cy.visit('/app/apm/services');
          cy.contains('Alerts and rules').click();
          cy.contains('Error count').click();
          cy.contains('Create threshold rule').click();

          // Check for the existence of this element to make sure the form
          // has loaded.
          cy.contains('for the last');

          // Save, with no actions
          cy.contains('button:not(:disabled)', 'Save').click();
          cy.get(confirmModalButtonSelector).click();

          cy.contains(`Created rule "${ruleName}`);
        });
      });
    });

    describe('when created from Stack management', () => {
      before(() => {
        cy.loginAsPowerUser();
        deleteAllRules();
        cy.intercept(
          'GET',
          '/api/alerting/rules/_find?page=1&per_page=10&default_search_operator=AND&sort_field=name&sort_order=asc'
        ).as('list rules API call');
      });

      after(() => {
        deleteAllRules();
      });

      it('creates a rule', () => {
        // Go to stack management
        cy.visit('/app/management/insightsAndAlerting/triggersActions/rules');

        // Wait for this call to finish so the create rule button does not disappear.
        // The timeout is set high because at this point we're also waiting for the
        // full page load.
        cy.wait('@list rules API call', { timeout: 30000 });

        // Create a rule
        cy.contains('button', 'Create rule').click();

        cy.get('[name=name]').type(ruleName);
        cy.contains('.euiFlyout button', ruleName).click();

        // Change the environment to "testing"
        cy.contains('Environment All').click();
        cy.get(comboBoxInputSelector).type('testing{enter}');

        // Save, with no actions
        cy.contains('button:not(:disabled)', 'Save').click();
        cy.get(confirmModalButtonSelector).click();

        cy.contains(`Created rule "${ruleName}`);
      });
    });
  });
});
