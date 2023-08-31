/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReturnTypeFromChainable } from '../../types';
import { indexEndpointHosts } from '../../tasks/index_endpoint_hosts';
import { login } from '../../tasks/login';
import { loadPage } from '../../tasks/common';

describe('Response actions history page', () => {
  let endpointData: ReturnTypeFromChainable<typeof indexEndpointHosts>;
  // let actionData: ReturnTypeFromChainable<typeof indexActionResponses>;

  before(() => {
    indexEndpointHosts({ numResponseActions: 11 }).then((indexEndpoints) => {
      endpointData = indexEndpoints;
    });
  });

  beforeEach(() => {
    login();
  });

  after(() => {
    if (endpointData) {
      endpointData.cleanup();
      // @ts-expect-error ignore setting to undefined
      endpointData = undefined;
    }
  });

  it('retains expanded action details on page reload', () => {
    loadPage(`/app/security/administration/response_actions_history`);
    cy.getByTestSubj('response-actions-list-expand-button').eq(3).click(); // 4th row on 1st page
    cy.getByTestSubj('response-actions-list-details-tray').should('exist');
    cy.url().should('include', 'withOutputs');

    // navigate to page 2
    cy.getByTestSubj('pagination-button-1').click();
    cy.getByTestSubj('response-actions-list-details-tray').should('not.exist');

    // reload with URL params on page 2 with existing URL
    cy.reload();
    cy.getByTestSubj('response-actions-list-details-tray').should('not.exist');

    // navigate to page 1
    cy.getByTestSubj('pagination-button-0').click();
    cy.getByTestSubj('response-actions-list-details-tray').should('exist');
  });

  it('collapses expanded tray with a single click', () => {
    loadPage(`/app/security/administration/response_actions_history`);
    // 2nd row on 1st page
    const row = cy.getByTestSubj('response-actions-list-expand-button').eq(1);

    // expand the row
    row.click();
    cy.getByTestSubj('response-actions-list-details-tray').should('exist');
    cy.url().should('include', 'withOutputs');

    // collapse the row
    cy.intercept('GET', '/api/endpoint/action*').as('getResponses');
    row.click();
    // wait for the API response to come back
    // and then see if the tray is actually closed
    cy.wait('@getResponses', { timeout: 500 }).then((xhr) => {
      cy.getByTestSubj('response-actions-list-details-tray').should('not.exist');
      cy.url().should('not.include', 'withOutputs');
    });
  });
});
