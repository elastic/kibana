/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  CREATE_CASE_FLYOUT_CLOSE_BUTTON,
  SAVE_LENS_MODAL_CLOSE_BUTTON,
  SELECT_CASE_MODAL,
  SELECT_CASE_MODAL_CLOSE_BUTTON,
  VIZ_ADD_TO_EXISTING_CASE_BUTTON,
  VIZ_ADD_TO_NEW_CASE_BUTTON,
  VIZ_INSPECT_BUTTON,
  VIZ_OPEN_IN_LENS_BUTTON,
  VIZ_SAVE_BUTTON,
} from '../screens/visualization_actions';

export const clickVizActionsButton = (button: string, tab?: string) => {
  if (tab) {
    cy.get(tab).click();
  }
  cy.get(button).click({ force: true });
};

export const clickVizActionsInspect = () => {
  cy.get(VIZ_INSPECT_BUTTON).click({ force: true });
};

export const clickVizActionsSave = () => {
  cy.get(VIZ_SAVE_BUTTON).click({ force: true });
};

export const clickVizActionsOpenInLens = () => {
  cy.get(VIZ_OPEN_IN_LENS_BUTTON).click({ force: true });
};

export const clickVizActionsAddToNewCase = () => {
  cy.get(VIZ_ADD_TO_NEW_CASE_BUTTON).click({ force: true });
};

export const clickVizActionsAddToExistingCase = () => {
  cy.get(VIZ_ADD_TO_EXISTING_CASE_BUTTON).click({ force: true });
};

export const vizActionsMenuShouldBeClosed = () => {
  cy.get(VIZ_INSPECT_BUTTON).should('not.exist');
  cy.get(VIZ_SAVE_BUTTON).should('not.exist');
  cy.get(VIZ_OPEN_IN_LENS_BUTTON).should('not.exist');
  cy.get(VIZ_ADD_TO_NEW_CASE_BUTTON).should('not.exist');
  cy.get(VIZ_ADD_TO_EXISTING_CASE_BUTTON).should('not.exist');
};

export const closeSaveObjectModal = () => {
  cy.get(SAVE_LENS_MODAL_CLOSE_BUTTON).click();
};

export const closeCreateCaseFlyout = () => {
  cy.get(CREATE_CASE_FLYOUT_CLOSE_BUTTON).click();
};

export const closeAllCasesModal = () => {
  cy.get(SELECT_CASE_MODAL_CLOSE_BUTTON).click();
};
