/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { login } from '../../tasks/login';
import { navigateTo } from '../../tasks/navigation';
import {
  checkResults,
  inputQuery,
  selectAllAgents,
  submitQuery,
  typeInECSFieldInput,
  typeInOsqueryFieldInput,
} from '../../tasks/live_query';
import { RESULTS_TABLE_CELL_WRRAPER } from '../../screens/live_query';
import { getAdvancedButton } from '../../screens/integrations';

describe('ALL - Live Query', () => {
  beforeEach(() => {
    login();
    navigateTo('/app/osquery');
  });

  it('should run query and enable ecs mapping', () => {
    const cmd = Cypress.platform === 'darwin' ? '{meta}{enter}' : '{ctrl}{enter}';
    cy.contains('New live query').click();
    selectAllAgents();
    inputQuery('select * from uptime; ');
    cy.wait(500);
    // checking submit by clicking cmd+enter
    inputQuery(cmd);
    checkResults();
    cy.contains('View in Discover').should('exist');
    cy.contains('View in Lens').should('exist');
    cy.react(RESULTS_TABLE_CELL_WRRAPER, {
      props: { id: 'osquery.days.number', index: 1 },
    });
    cy.react(RESULTS_TABLE_CELL_WRRAPER, {
      props: { id: 'osquery.hours.number', index: 2 },
    });

    getAdvancedButton().click();
    typeInECSFieldInput('message{downArrow}{enter}');
    typeInOsqueryFieldInput('days{downArrow}{enter}');
    submitQuery();

    checkResults();
    cy.react(RESULTS_TABLE_CELL_WRRAPER, {
      props: { id: 'message', index: 1 },
    });
    cy.react(RESULTS_TABLE_CELL_WRRAPER, {
      props: { id: 'osquery.days.number', index: 2 },
    }).react('EuiIconIndexMapping');
  });
});
