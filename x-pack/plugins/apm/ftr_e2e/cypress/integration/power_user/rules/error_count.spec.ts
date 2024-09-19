/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

describe('Rules', () => {
  describe('Error count', () => {
    const ruleName = 'Error count threshold';
    const comboBoxInputSelector =
      '.euiPopover__panel-isOpen [data-test-subj=comboBoxSearchInput]';
    const confirmModalButtonSelector =
      '.euiModal button[data-test-subj=confirmModalConfirmButton]';
    const deleteButtonSelector =
      '[data-test-subj=deleteActionHoverButton]:first';
    const editButtonSelector = '[data-test-subj=editActionHoverButton]:first';

    describe('when created from APM', () => {
      describe('when created from Service Inventory', () => {
        before(() => {
          cy.loginAsPowerUser();
        });

        it('creates and updates a rule', () => {
          // Create a rule in APM
          cy.visit('/app/apm/services');
          cy.contains('Alerts and rules').click();
          cy.contains('Error count').click();
          cy.contains('Create threshold rule').click();

          // Change the environment to "testing"
          cy.contains('Environment All').click();
          cy.get(comboBoxInputSelector).type('testing{enter}');

          // Save, with no actions
          cy.contains('button:not(:disabled)', 'Save').click();
          cy.get(confirmModalButtonSelector).click();

          cy.contains(`Created rule "${ruleName}`);

          // Go to Stack Management
          cy.contains('Alerts and rules').click();
          cy.contains('Manage rules').click();

          // Edit the rule, changing the environment to "All"
          cy.get(editButtonSelector).click();
          cy.contains('Environment testing').click();
          cy.get(comboBoxInputSelector).type('All{enter}');
          cy.contains('button:not(:disabled)', 'Save').click();

          cy.contains(`Updated '${ruleName}'`);

          // Wait for the table to be ready for next edit click
          cy.get('.euiBasicTable').not('.euiBasicTable-loading');

          // Ensure the rule now shows "All" for the environment
          cy.get(editButtonSelector).click();
          cy.contains('Environment All');
          cy.contains('button', 'Cancel').click();

          // Delete the rule
          cy.get(deleteButtonSelector).click();
          cy.get(confirmModalButtonSelector).click();

          // Ensure the table is empty
          cy.contains('Create your first rule');
        });
      });
    });

    describe('when created from Stack management', () => {
      before(() => {
        cy.loginAsPowerUser();
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

        // Wait for the table to be ready for next delete click
        cy.get('.euiBasicTable').not('.euiBasicTable-loading');

        // Delete the rule
        cy.get(deleteButtonSelector).click();
        cy.get(confirmModalButtonSelector).click();

        // Ensure the table is empty
        cy.contains('Create your first rule');
      });
    });
  });
});
