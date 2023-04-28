/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { POLICIES_URL } from '../../../../cypress/urls/navigation';

export const visitPolicyDetailsPage = () => {
  cy.visit(POLICIES_URL);

  cy.getByTestSubj('policyNameCellLink').eq(0).click({ force: true });
  cy.getByTestSubj('policyDetailsPage').should('exist');
  cy.get('#settings').should('exist'); // waiting for Policy Settings tab
};
