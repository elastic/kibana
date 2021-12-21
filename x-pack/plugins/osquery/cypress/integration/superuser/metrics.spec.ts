/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { navigateTo } from '../../tasks/navigation';
import { login } from '../../tasks/login';
import { checkResults, inputQuery, submitQuery } from '../../tasks/live_query';
import { ArchiverMethod, runKbnArchiverScript } from '../../tasks/archiver';

describe('SU - Metrics', () => {
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
      runKbnArchiverScript(ArchiverMethod.LOAD, 'saved_query');
      cy.wait(500);
      cy.get('[data-test-subj="toggleNavButton"]').click();
      cy.get('[data-test-subj="collapsibleNavAppLink"').contains('Metrics').click();

      cy.wait(500);
      cy.get('[data-test-subj="nodeContainer"]').click();
      cy.contains('Osquery').click();

      cy.get('[data-test-subj="comboBoxInput"]').first().wait(500).click();
      cy.wait(500);
      cy.get('div[role=listBox]').should('have.lengthOf.above', 0).first().click();

      submitQuery();
      checkResults();
      runKbnArchiverScript(ArchiverMethod.UNLOAD, 'saved_query');
    });
  });
});
