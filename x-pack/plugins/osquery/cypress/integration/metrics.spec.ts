/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { navigateTo } from '../tasks/navigation';
import { checkResults, inputQuery, submitQuery } from '../tasks/live_query';
import { login } from '../tasks/login';

describe('Metrics', () => {
  beforeEach(() => {
    login();
  });
  describe("should be able to add query from Node's navigation", () => {
    beforeEach(() => {
      navigateTo('/app/osquery');
    });

    it('should be able to run the query', () => {
      cy.get('[data-test-subj="toggleNavButton"]').click();
      cy.contains('Metrics').click();

      cy.wait(1000);
      cy.get('[data-test-subj="nodeContainer"]').click();
      cy.contains('Osquery').click();

      inputQuery('select * from uptime;');
      submitQuery();
      checkResults();
    });
    it('should be able to run the previously saved query', () => {
      cy.get('[data-test-subj="toggleNavButton"]').click();
      cy.contains('Metrics').click();

      cy.wait(1000);
      cy.get('[data-test-subj="nodeContainer"]').click();
      cy.contains('Osquery').click();

      cy.get('[data-test-subj="comboBoxInput"]').click();
      cy.wait(1000);
      cy.get('div[role=listBox]').should('have.lengthOf.above', 0).first().click();

      submitQuery();
      checkResults();
    });
  });
});
