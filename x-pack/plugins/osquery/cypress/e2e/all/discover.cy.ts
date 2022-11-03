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
  before(() => {
    login(ROLES.admin);
    cy.request({
      method: 'POST',
      url: '/api/spaces/space',
      body: {
        id: 'custom-space',
        name: 'custom-space',
      },
      headers: { 'kbn-xsrf': 'create-space' },
    });
  });

  after(() => {
    login(ROLES.admin);
    cy.request({
      method: 'DELETE',
      url: '/api/spaces/space/custom-space',
      headers: { 'kbn-xsrf': 'delete-space' },
    });
  });

  ['default', 'custom-space'].forEach((space) => {
    describe(`[${space}]`, () => {
      beforeEach(() => {
        login(ROLES.soc_manager);
        navigateTo(`/s/${space}/app/osquery`);
      });

      it('should be opened in new tab in results table', () => {
        cy.contains('New live query').click();
        selectAllAgents();
        inputQuery('select * from uptime; ');
        submitQuery();
        checkResults();
        cy.contains('View in Lens').should('exist');
        cy.contains('View in Discover')
          .should('exist')
          .should('have.attr', 'href')
          .then(($href) => {
            // @ts-expect-error-next-line href string - check types
            cy.visit($href);
            cy.getBySel('breadcrumbs').contains('Discover').should('exist');
            cy.getBySel('discoverDocTable', { timeout: 60000 }).contains(
              'action_data.queryselect * from uptime'
            );
          });
      });
    });
  });
});
