/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { tag } from '../../../tags';

import { getServiceNowConnector, getServiceNowITSMHealthResponse } from '../../../objects/case';

import { SERVICE_NOW_MAPPING } from '../../../screens/configure_cases';

import { goToEditExternalConnection } from '../../../tasks/all_cases';
import { cleanKibana, deleteCases, deleteConnectors } from '../../../tasks/common';
import {
  addServiceNowConnector,
  openAddNewConnectorOption,
  verifyNewConnectorSelected,
} from '../../../tasks/configure_cases';
import { login, visitWithoutDateRange } from '../../../tasks/login';

import { CASES_URL } from '../../../urls/navigation';

describe('Cases connectors', { tags: [tag.ESS, tag.SERVERLESS] }, () => {
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

  before(() => {
    cleanKibana();
  });

  beforeEach(() => {
    login();
    deleteCases();
    cy.intercept('GET', `${snConnector.URL}/api/x_elas2_inc_int/elastic_api/health*`, {
      statusCode: 200,
      body: getServiceNowITSMHealthResponse(),
    });

    cy.intercept('POST', '/api/actions/connector').as('createConnector');
    cy.intercept({ method: '+(POST|PATCH)', url: '/api/cases/configure' }, (req) => {
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

  after(() => {
    deleteConnectors();
  });

  it('Configures a new connector', () => {
    visitWithoutDateRange(CASES_URL);
    goToEditExternalConnection();
    openAddNewConnectorOption();
    addServiceNowConnector(snConnector);

    cy.wait('@createConnector').then(({ response }) => {
      cy.wrap(response?.statusCode).should('eql', 200);

      verifyNewConnectorSelected(snConnector);

      cy.wait('@saveConnector').its('response.statusCode').should('eql', 200);
      cy.get(SERVICE_NOW_MAPPING).first().should('have.text', 'short_description');
    });
  });
});
