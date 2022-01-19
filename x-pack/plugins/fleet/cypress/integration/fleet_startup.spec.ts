/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ADD_AGENT_BUTTON, AGENT_POLICIES_TAB, ENROLLMENT_TOKENS_TAB } from '../screens/fleet';
import { FLEET, navigateTo } from '../tasks/navigation';

describe('Fleet startup', () => {
  before(() => {
    navigateTo(FLEET);
  });

  it.skip('should display Add agent button and Healthy agent once Fleet Agent page loaded', () => {
    cy.getBySel(ADD_AGENT_BUTTON).contains('Add agent');
    cy.get('.euiBadge').contains('Healthy');
  });

  it('should display default agent policies on agent policies tab', () => {
    cy.getBySel(AGENT_POLICIES_TAB).click();
    cy.get('.euiLink').contains('Default policy');
    cy.get('.euiLink').contains('Default Fleet Server policy');
  });

  it('should display default tokens on enrollment tokens tab', () => {
    cy.getBySel(ENROLLMENT_TOKENS_TAB).click();
    cy.get('.euiTableRow').should('have.length', 2);
    cy.get('.euiTableRowCell').contains('Default policy');
    cy.get('.euiTableRowCell').contains('Default Fleet Server policy');
  });
});
