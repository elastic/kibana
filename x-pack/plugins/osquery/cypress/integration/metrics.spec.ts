/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { navigateTo } from '../tasks/navigation';
import {
  checkResults,
  DEFAULT_QUERY,
  findAndClickButton,
  findFormFieldByRowsLabelAndType,
  inputQuery,
  submitQuery,
} from '../tasks/live_query';
import { login } from '../tasks/login';

describe('Metrics', () => {
  const SAVED_QUERY_ID = 'savedQueryForMetrics';
  const SAVED_QUERY_DESCRIPTION = 'savedDescriptionForMetrics';
  beforeEach(() => {
    login();
  });
  describe('should enable usage of Osquery', () => {
    beforeEach(() => {
      navigateTo('/app/osquery');
    });

    it('by being able to run the query', () => {
      cy.get('[data-test-subj="toggleNavButton"]').click();
      cy.contains('Metrics').click();

      cy.wait(1000);

      cy.get('[data-test-subj="nodeContainer"]').click();
      cy.contains('Osquery').click();
      inputQuery('select * from uptime;');

      submitQuery();
      checkResults();
    });
    it('by being able to run the previously saved query', () => {
      cy.contains('Saved queries').click();
      cy.contains('Add saved query').click();
      inputQuery(DEFAULT_QUERY);
      cy.waitForReact(1000);

      findFormFieldByRowsLabelAndType('ID', SAVED_QUERY_ID);
      findFormFieldByRowsLabelAndType('Description', SAVED_QUERY_DESCRIPTION);
      findAndClickButton('Save');
      cy.wait(1000);
      cy.get('[data-test-subj="toggleNavButton"]').click();
      cy.get('[data-test-subj="collapsibleNavAppLink"').contains('Metrics').click();

      cy.wait(1000);
      cy.get('[data-test-subj="nodeContainer"]').click();
      cy.contains('Osquery').click();

      cy.get('[data-test-subj="comboBoxInput"]').first().click();
      cy.wait(1000);
      cy.get('div[role=listBox]').should('have.lengthOf.above', 0).first().click();

      submitQuery();
      checkResults();
    });
  });
});
