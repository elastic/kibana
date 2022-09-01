/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FLEET, navigateTo } from '../tasks/navigation';
import { createAgentPolicy } from '../tasks/fleet';
import { cleanupAgentPolicies } from '../tasks/cleanup';
import { ENROLLMENT_TOKENS_TAB, ENROLLMENT_TOKENS } from '../screens/fleet';

describe('Home page', () => {
  before(() => {
    navigateTo(FLEET);
    createAgentPolicy();
    cy.getBySel(ENROLLMENT_TOKENS_TAB).click();
  });

  after(() => {
    cleanupAgentPolicies();
  });

  it('Create new Token', () => {
    cy.getBySel(ENROLLMENT_TOKENS.CREATE_TOKEN_BUTTON).click();
    cy.getBySel(ENROLLMENT_TOKENS.CREATE_TOKEN_MODAL_NAME_FIELD).clear().type('New Token');
    cy.getBySel(ENROLLMENT_TOKENS.CREATE_TOKEN_MODAL_SELECT_FIELD).contains('Agent policy 1');
    cy.get('.euiButton').contains('Create enrollment token').click({ force: true });

    cy.getBySel(ENROLLMENT_TOKENS.LIST_TABLE, { timeout: 15000 }).contains('Agent policy 1');
  });

  it('Delete Token', () => {
    cy.visit('app/fleet/enrollment-tokens');
    cy.getBySel(ENROLLMENT_TOKENS.LIST_TABLE).find('tr').should('have.length', 2);
    cy.getBySel(ENROLLMENT_TOKENS.TABLE_REVOKE_BTN).click();
    cy.get('.euiPanel').contains('Are you sure you want to revoke');
    cy.get('.euiButton').contains('Revoke enrollment token').click({ force: true });

    cy.getBySel(ENROLLMENT_TOKENS.LIST_TABLE).find('tr').should('have.length', 2);
  });
});
