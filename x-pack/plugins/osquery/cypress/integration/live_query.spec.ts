/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { login } from '../tasks/login';
import { navigateTo } from '../tasks/navigation';
import { checkResults, inputQuery, selectAllAgents, submitQuery } from '../tasks/live_query';

describe('Live Query', () => {
  beforeEach(() => {
    login();
  });

  describe('should run a live query', () => {
    beforeEach(() => {
      navigateTo('/app/osquery');
      cy.waitForReact(1000);
    });

    it('and enable mapping in the results table', () => {
      cy.wait(1000);
      cy.contains('New live query').click();
      selectAllAgents();
      inputQuery('select * from uptime;');
      submitQuery();

      checkResults();
      cy.react('EuiDataGridHeaderCellWrapper', {
        props: { id: 'osquery.days', index: 1 },
      });
      cy.react('EuiDataGridHeaderCellWrapper', {
        props: { id: 'osquery.hours', index: 2 },
      });

      cy.react('EuiAccordion', { props: { buttonContent: 'Advanced' } }).click();
      cy.get('[data-test-subj="ECS-field-input"]').click().type('message{downArrow}{enter}');
      cy.react('OsqueryColumnFieldComponent')
        .first()
        .react('ResultComboBox')
        .click()
        .type('days{downArrow}{enter}');
      submitQuery();

      checkResults();
      cy.react('EuiDataGridHeaderCellWrapper', {
        props: { id: 'message', index: 1 },
      });
      cy.react('EuiDataGridHeaderCellWrapper', {
        props: { id: 'osquery.days', index: 2 },
      }).react('EuiIconIndexMapping');
    });
  });
});
