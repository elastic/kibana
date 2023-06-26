/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const expectRulesWithExecutionStatus = (status: string, expectedCount: number) => {
  cy.get(`[data-test-subj="ruleExecutionStatus"]:contains("${status}")`).should(
    'have.length',
    expectedCount
  );
};

export const filterByExecutionStatus = (status: string) => {
  cy.get('[data-test-subj="executionStatusFilterButton"]').click();
  cy.get(`[data-test-subj="executionStatusFilterOption"]:contains("${status}")`).click();
  cy.get('[data-test-subj="ruleName"]').should('have.length', 1);
  expectRulesWithExecutionStatus(status, 1);
};
