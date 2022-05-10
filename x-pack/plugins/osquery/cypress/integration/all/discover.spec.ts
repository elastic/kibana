/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { login } from '../../tasks/login';
import { navigateTo } from '../../tasks/navigation';
import { checkResults, inputQuery, selectAllAgents, submitQuery } from '../../tasks/live_query';
import { ROLES } from '../../test';

// TODO:  So far just one test, but this is a good place to start. Move tests from pack view into here.
describe('ALL - Discover', () => {
  beforeEach(() => {
    login(ROLES.soc_manager);
    navigateTo('/app/osquery');
  });

  it('should be opened in new tab in results table', () => {
    let newUrl = '';
    cy.window().then((win) => {
      cy.stub(win, 'open')
        .as('windowOpen')
        .callsFake((url) => {
          newUrl = url;
        });
    });
    cy.contains('New live query').click();
    selectAllAgents();
    inputQuery('select * from uptime; ');
    submitQuery();
    checkResults();
    // wait for the newUrl to be built
    cy.wait(500);
    cy.contains('View in Lens').should('exist');
    cy.contains('View in Discover').should('exist').click();

    cy.window()
      .its('open')
      .then(() => {
        cy.visit(newUrl);
      });

    cy.getBySel('breadcrumbs').contains('Discover').should('exist');
    cy.getBySel('discoverDocTable', { timeout: 60000 }).contains(
      'action_data.queryselect * from uptime'
    );
  });
});
