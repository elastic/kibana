/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { serviceNowConnector } from '../objects/case';

import { SERVICE_NOW_MAPPING, TOASTER } from '../screens/configure_cases';

import { goToEditExternalConnection } from '../tasks/all_cases';
import {
  addServiceNowConnector,
  openAddNewConnectorOption,
  selectLastConnectorCreated,
} from '../tasks/configure_cases';
import { loginAndWaitForPageWithoutDateRange } from '../tasks/login';

import { CASES_URL } from '../urls/navigation';

describe('Cases connectors', () => {
  const configureResult = {
    connector: {
      id: 'e271c3b8-f702-4fbc-98e0-db942b573bbd',
      name: 'SN',
      type: '.servicenow',
      fields: null,
    },
    closure_type: 'close-by-user',
    created_at: '2020-12-01T16:28:09.219Z',
    created_by: { email: null, full_name: null, username: 'elastic' },
    updated_at: null,
    updated_by: null,
    mappings: [
      { source: 'title', target: 'short_description', action_type: 'overwrite' },
      { source: 'description', target: 'description', action_type: 'overwrite' },
      { source: 'comments', target: 'comments', action_type: 'append' },
    ],
    version: 'WzEwNCwxXQ==',
  };
  before(() => {
    cy.server();
    cy.route('POST', '**/api/actions/action').as('createConnector');
    cy.route2('POST', `**/api/cases/configure`, (req) => {
      const connector = JSON.parse(req.body).connector;
      req.reply(JSON.stringify({ ...configureResult, connector }));
    });
  });

  it('Configures a new connector', () => {
    loginAndWaitForPageWithoutDateRange(CASES_URL);
    goToEditExternalConnection();
    openAddNewConnectorOption();
    addServiceNowConnector(serviceNowConnector);

    cy.wait('@createConnector').its('status').should('eql', 200);
    cy.get(TOASTER).should('have.text', "Created 'New connector'");
    cy.get(TOASTER).should('not.exist');

    selectLastConnectorCreated();

    cy.get(SERVICE_NOW_MAPPING).first().should('have.text', 'short_description');
    cy.get(TOASTER).should('have.text', 'Saved external connection settings');
  });
});
