/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const preparePack = (packName: string) => {
  cy.contains('Packs').click();
  const createdPack = cy.contains(packName);
  createdPack.click();
};

export const deactivatePack = (packName: string, confirmButton?: boolean) => {
  cy.react('ActiveStateSwitchComponent', {
    props: { item: { attributes: { name: packName } } },
  }).click();
  if (confirmButton) {
    cy.getBySel('confirmModalConfirmButton').click();
  }

  cy.contains(`Successfully deactivated "${packName}" pack`).should('not.exist');
  cy.contains(`Successfully deactivated "${packName}" pack`).should('exist');
};

export const activatePack = (packName: string, confirmButton?: boolean) => {
  cy.react('ActiveStateSwitchComponent', {
    props: { item: { attributes: { name: packName } } },
  }).click();
  if (confirmButton) {
    cy.getBySel('confirmModalConfirmButton').click();
  }

  cy.contains(`Successfully activated "${packName}" pack`).should('not.exist');
  cy.contains(`Successfully activated "${packName}" pack`).should('exist');
};
