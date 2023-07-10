/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReturnTypeFromChainable } from '../../types';
import { indexEndpointHosts } from '../../tasks/index_endpoint_hosts';
import { login } from '../../tasks/login';

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
    cy.visit(`/app/security/administration/response_actions_history`);
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
});
