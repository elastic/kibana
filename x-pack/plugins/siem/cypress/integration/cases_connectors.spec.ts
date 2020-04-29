/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { loginAndWaitForPageWithoutDateRange } from '../tasks/login';
import { CASES } from '../urls/navigation';
import { MAIN_PAGE } from '../screens/siem_main';

describe('Cases connectors', () => {
  before(() => {
    cy.server();
    cy.route('POST', '**/api/action').as('createConnector');
    cy.route('PATCH', '**/api/cases/configure').as('saveConnector');
  });

  it('Configures a new connector', () => {
    loginAndWaitForPageWithoutDateRange(CASES);
    cy.get("[data-test-subj='configure-case-button']").click({ force: true });
    cy.get("[data-test-subj='header-page-title']").should('exist');
    cy.get("[data-test-subj='header-page-title']").should('have.text', 'Configure cases Beta');
    cy.get(MAIN_PAGE).then($page => {
      if ($page.find("[data-test-subj='.servicenow-card']").length !== 1) {
        cy.wait(1000);
        cy.get("[data-test-subj='case-configure-add-connector-button']").click({ force: true });
      }
    });
    cy.get("[data-test-subj='.servicenow-card']").click();
    cy.get("[data-test-subj='nameInput']").type('New connector');
    cy.get("[data-test-subj='apiUrlFromInput']").type('https://www.test.service-now.com');
    cy.get("[data-test-subj='usernameFromInput']").type('usernmae');
    cy.get("[data-test-subj='passwordFromInput']").type('password');
    cy.get("[data-test-subj='saveNewActionButton']").click({ force: true });
    cy.wait('@createConnector')
      .its('status')
      .should('eql', 200);
    cy.get('[data-test-subj="euiToastHeader"]').should('exist');
    cy.get('[data-test-subj="euiToastHeader"]').should('have.text', "Created 'New connector'");
    cy.get("[data-test-subj='dropdown-connectors']").click({ force: true });
    cy.get('@createConnector')
      .its('response')
      .then(response => {
        cy.get(`[data-test-subj='dropdown-connector-${response.body.id}']`).click();
      });
    cy.get('[data-test-subj="case-configure-action-bottom-bar-save-button"]').click();
    cy.wait('@saveConnector')
      .its('status')
      .should('eql', 200);
    cy.get('[data-test-subj="euiToastHeader"]').should('exist');
    cy.get('[data-test-subj="euiToastHeader"]').should(
      'have.text',
      'Saved external connection settings'
    );
  });
});
