/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { serviceNowConnector } from '../objects/case';

import { TOASTER } from '../screens/configure_cases';

import { goToEditExternalConnection } from '../tasks/all_cases';
import {
  addServiceNowConnector,
  openAddNewConnectorOption,
  selectLastConnectorCreated,
} from '../tasks/configure_cases';
import { loginAndWaitForPageWithoutDateRange } from '../tasks/login';

import { CASES_URL } from '../urls/navigation';

describe('Cases connectors', () => {
  before(() => {
    cy.route2('POST', '/api/actions/action').as('createConnector');
    cy.route2('POST', 'api/cases/configure').as('saveConnector');
  });

  it('Configures a new connector', () => {
    loginAndWaitForPageWithoutDateRange(CASES_URL);
    goToEditExternalConnection();
    openAddNewConnectorOption();
    addServiceNowConnector(serviceNowConnector);

    cy.wait('@createConnector').then(({ response }) => {
      // @ts-expect-error statusCode isn't typed properly
      cy.wrap(response.statusCode).should('eql', 200);
      cy.get(TOASTER).should('have.text', "Created 'New connector'");
      cy.get(TOASTER).should('not.exist');

      const bodyJSON = JSON.parse(response.body as string);

      selectLastConnectorCreated(bodyJSON.id);

      cy.wait('@saveConnector', { timeout: 10000 }).its('response.statusCode').should('eql', 200);
      cy.get(TOASTER).should('have.text', 'Saved external connection settings');
    });
  });
});
