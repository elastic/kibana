/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { APP_ENDPOINTS_PATH } from '../../../../../common/constants';
import { login } from '../../tasks/login';

describe('Endpoints page', () => {
  beforeEach(() => {
    login();
  });

  it('Loads the endpoints page', () => {
    cy.visit(APP_ENDPOINTS_PATH);
    cy.contains('Hosts running Elastic Defend').should('exist');
  });

  it('should update endpoint policy on Endpoint', () => {
    const parseRevNumber = (revString: string) => Number(revString.match(/\d+/)?.[0]);

    cy.visit(APP_ENDPOINTS_PATH);

    cy.getBySel('policyListRevNo')
      .eq(0)
      .invoke('text')
      .then(parseRevNumber)
      .then((initialRevisionNumber) => {
        // Update policy
        cy.getBySel('policyNameCellLink').eq(0).click();

        cy.getBySel('policyDetailsSaveButton').click();
        cy.getBySel('policyDetailsConfirmModal').should('exist');
        cy.getBySel('confirmModalConfirmButton').click();
        cy.contains(/has been updated/);

        cy.getBySel('policyDetailsBackLink').click();

        // Assert disappearing 'Out-of-date' indicator, Success Policy Status and increased revision number
        cy.getBySel('rowPolicyOutOfDate').should('exist');
        cy.getBySel('rowPolicyOutOfDate').should('not.exist'); // depends on the 10s auto-refresh

        cy.getBySel('policyStatusCellLink').eq(0).should('contain', 'Success');

        cy.getBySel('policyListRevNo')
          .eq(0)
          .invoke('text')
          .then(parseRevNumber)
          .should('equal', initialRevisionNumber + 1);
      });
  });
});
