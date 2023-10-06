/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const openAlertDetailsView = (): void => {
  cy.getByTestSubj('expand-event').first().click();
  cy.getByTestSubj('take-action-dropdown-btn').click();
};

export const openResponderFromEndpointAlertDetails = (): void => {
  cy.getByTestSubj('endpointResponseActions-action-item').click();
};

export const addAlertToCase = (caseId: string, caseOwner: string): void => {
  cy.getByTestSubj('add-to-existing-case-action').click();
  cy.getByTestSubj(`cases-table-row-select-${caseId}`).click();
  cy.contains(`An alert was added to \"Test ${caseOwner} case`);
};
