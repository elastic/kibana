/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { synthtrace } from '../../../../synthtrace';
import { generateData } from './generate_data';

function deleteAllRules() {
  cy.log('Delete all rules');
  cy.request({
    log: false,
    method: 'GET',
    url: '/api/alerting/rules/_find',
    auth: { user: 'editor', pass: 'changeme' },
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
        auth: { user: 'editor', pass: 'changeme' },
      });
    });
  });
}

describe('Rules', () => {
  beforeEach(() => {
    deleteAllRules();
  });

  after(() => {
    deleteAllRules();
  });

  before(() => {
    const start = '2021-10-10T00:00:00.000Z';
    const end = '2021-10-10T00:01:00.000Z';
    synthtrace.index(
      generateData({
        from: new Date(start).getTime(),
        to: new Date(end).getTime(),
      })
    );
  });

  after(() => {
    synthtrace.clean();
  });

  describe('Error count', () => {
    const ruleName = 'Error count threshold';
    const comboBoxInputSelector =
      '[data-popover-open] [data-test-subj=comboBoxSearchInput]';
    const confirmModalButtonSelector =
      '.euiModal button[data-test-subj=confirmModalConfirmButton]';

    describe('when created from APM', () => {
      describe('when created from Service Inventory', () => {
        it('creates a rule', () => {
          cy.loginAsEditorUser();

          // Create a rule in APM
          cy.visitKibana('/app/apm/services');
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
      it('creates a rule', () => {
        cy.loginAsEditorUser();

        // Go to stack management
        cy.visitKibana(
          '/app/management/insightsAndAlerting/triggersActions/rules'
        );

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
