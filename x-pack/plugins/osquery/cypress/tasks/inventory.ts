/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const triggerLoadData = () => {
  cy.getBySel('infraWaffleTimeControlsAutoRefreshButton').should('exist');
  cy.wait(1000);
  cy.getBySel('infraWaffleTimeControlsAutoRefreshButton').click();
  cy.getBySel('nodeContainer').eq(2).should('exist');
  cy.getBySel('infraWaffleTimeControlsStopRefreshingButton').click();
  cy.getBySel('nodeContainer').eq(2).click();
};
