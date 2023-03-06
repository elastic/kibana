/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { closeModalIfVisible, closeToastIfVisible } from './integrations';

export const preparePack = (packName: string) => {
  cy.contains('Packs').click();
  const createdPack = cy.contains(packName);
  createdPack.click();
};

export const deactivatePack = (packName: string) => {
  cy.react('ActiveStateSwitchComponent', {
    props: { item: { attributes: { name: packName } } },
  }).click();
  closeModalIfVisible();

  cy.contains(`Successfully deactivated "${packName}" pack`).should('not.exist');
  cy.contains(`Successfully deactivated "${packName}" pack`).should('exist');
  closeToastIfVisible();
};

export const activatePack = (packName: string) => {
  cy.react('ActiveStateSwitchComponent', {
    props: { item: { attributes: { name: packName } } },
  }).click();
  closeModalIfVisible();

  cy.contains(`Successfully activated "${packName}" pack`).should('not.exist');
  cy.contains(`Successfully activated "${packName}" pack`).should('exist');
  closeToastIfVisible();
};
