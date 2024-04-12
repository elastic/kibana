/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { synthtrace } from '../../../synthtrace';
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

describe('Alerts', () => {
  beforeEach(() => {
    deleteAllRules();
  });

  after(() => {
    deleteAllRules();
  });

  before(() => {
    const start = Date.now() - 1000 * 60 * 10;
    const end = Date.now() + 1000 * 60 * 5;

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

  describe('when rendered from Service view in APM app', () => {
    const ruleName = 'Error count threshold';
    const confirmModalButtonSelector =
      '.euiModal button[data-test-subj=confirmModalConfirmButton]';

    it('alerts table is rendered correctly', () => {
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

      // Update "Is above" to "0"
      cy.contains('is above').click();
      cy.getByTestSubj('apmIsAboveFieldFieldNumber').clear();
      cy.contains('is above 0 errors');

      // Save, with no actions
      cy.contains('Save').click();
      cy.get(confirmModalButtonSelector).click();

      cy.contains(`Created rule "${ruleName}`);

      // Check that the "Alerts" table is loaded
      cy.wait(2000);
      cy.visitKibana('/app/apm/services/opbeans-java/alerts');
      cy.getByTestSubj('o11yGetRenderCellValueLink')
        .first()
        .click({ force: true });
      cy.getByTestSubj('alertsFlyout').should('exist');
      cy.contains('Overview');
      cy.contains('Status');
      cy.contains('Active');
    });
  });
});
