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
          cy.contains('Create error count rule').click();

          // Check for the existence of these elements to make sure the form
          // has loaded.
          cy.contains('for the last');
          cy.contains('Actions');
          cy.contains('Save').should('not.be.disabled');

          // Save, with no actions
          cy.contains('Save').click();
          cy.get(confirmModalButtonSelector).click();

          cy.contains(`Created rule "${ruleName}`);
        });
      });
    });

    describe('when created from Stack management', () => {
      before(() => {
        cy.loginAsPowerUser();
        deleteAllRules();
      });

      after(() => {
        deleteAllRules();
      });

      it('creates a rule', () => {
        // Go to stack management
        cy.visit('/app/management/insightsAndAlerting/triggersActions/rules');

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
