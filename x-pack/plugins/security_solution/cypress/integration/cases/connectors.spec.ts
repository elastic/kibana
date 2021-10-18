/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getServiceNowConnector, getServiceNowITSMHealthResponse } from '../../objects/case';

import { SERVICE_NOW_MAPPING, TOASTER } from '../../screens/configure_cases';

import { goToEditExternalConnection } from '../../tasks/all_cases';
import { cleanKibana } from '../../tasks/common';
import {
  addServiceNowConnector,
  openAddNewConnectorOption,
  selectLastConnectorCreated,
} from '../../tasks/configure_cases';
import { loginAndWaitForPageWithoutDateRange } from '../../tasks/login';

import { CASES_URL } from '../../urls/navigation';

// Skipping flakey test: https://github.com/elastic/kibana/issues/115438
describe.skip('Cases connectors', () => {
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
    error: null,
    updated_at: null,
    updated_by: null,
    mappings: [
      { source: 'title', target: 'short_description', action_type: 'overwrite' },
      { source: 'description', target: 'description', action_type: 'overwrite' },
      { source: 'comments', target: 'comments', action_type: 'append' },
    ],
    version: 'WzEwNCwxXQ==',
    id: '123',
    owner: 'securitySolution',
  };

  const snConnector = getServiceNowConnector();

  beforeEach(() => {
    cleanKibana();
    cy.intercept('GET', `${snConnector.URL}/api/x_elas2_inc_int/elastic_api/health*`, {
      statusCode: 200,
      body: getServiceNowITSMHealthResponse(),
    });

    cy.intercept('POST', '/api/actions/connector').as('createConnector');
    cy.intercept('POST', '/api/cases/configure', (req) => {
      const connector = req.body.connector;
      req.reply((res) => {
        res.send(200, { ...configureResult, connector });
      });
    }).as('saveConnector');

    cy.intercept('GET', '/api/cases/configure', (req) => {
      req.reply((res) => {
        const resBody =
          res.body.length > 0 && res.body[0].version != null
            ? [
                {
                  ...res.body[0],
                  error: null,
                  mappings: [
                    { source: 'title', target: 'short_description', action_type: 'overwrite' },
                    { source: 'description', target: 'description', action_type: 'overwrite' },
                    { source: 'comments', target: 'comments', action_type: 'append' },
                  ],
                },
              ]
            : res.body;
        res.send(200, resBody);
      });
    });
  });

  it('Configures a new connector', () => {
    loginAndWaitForPageWithoutDateRange(CASES_URL);
    goToEditExternalConnection();
    openAddNewConnectorOption();
    addServiceNowConnector(snConnector);

    cy.wait('@createConnector').then(({ response }) => {
      cy.wrap(response?.statusCode).should('eql', 200);
      cy.get(TOASTER).should('have.text', "Created 'New connector'");
      cy.get(TOASTER).should('not.exist');

      selectLastConnectorCreated(response?.body.id);

      cy.wait('@saveConnector', { timeout: 10000 }).its('response.statusCode').should('eql', 200);
      cy.get(SERVICE_NOW_MAPPING).first().should('have.text', 'short_description');
      cy.get(TOASTER).should('have.text', 'Saved external connection settings');
    });
  });
});
