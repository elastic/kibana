/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  FLYOUT_ADD_TO_EXISTING_CASE_ITEM,
  FLYOUT_ADD_TO_NEW_CASE_ITEM,
  INDICATORS_TABLE_ADD_TO_EXISTING_CASE_BUTTON_ICON,
  INDICATORS_TABLE_ADD_TO_NEW_CASE_BUTTON_ICON,
  CASE_ACTION_WRAPPER,
  CASE_ELLIPSE_BUTTON,
  CASE_ELLIPSE_DELETE_CASE_CONFIRMATION_BUTTON,
  CASE_ELLIPSE_DELETE_CASE_OPTION,
  CREATE_CASE_BUTTON,
  NEW_CASE_CREATE_BUTTON,
  NEW_CASE_DESCRIPTION_INPUT,
  NEW_CASE_NAME_INPUT,
  SELECT_CASE_TABLE_ROW,
  SELECT_EXISTING_CASE,
  SELECT_EXISTING_CASES_MODAL,
  VIEW_CASE_TOASTER_LINK,
} from '../screens/cases';

/**
 * Open the add to new case flyout from the indicators table more actions menu
 */
export const openAddToNewCaseFlyoutFromTable = () => {
  cy.get(INDICATORS_TABLE_ADD_TO_NEW_CASE_BUTTON_ICON).first().click();
};

/**
 * Open the add to existing case flyout from the indicators table more actions menu
 */
export const openAddToExistingCaseFlyoutFromTable = () => {
  cy.get(INDICATORS_TABLE_ADD_TO_EXISTING_CASE_BUTTON_ICON).first().click();
};

/**
 * Open the new case flyout from the indicators flyout take action menu
 */
export const openAddToNewCaseFromFlyout = () => {
  cy.get(FLYOUT_ADD_TO_NEW_CASE_ITEM).first().click();
};

/**
 * Open the new existing flyout from the indicators flyout take action menu
 */
export const openAddToExistingCaseFromFlyout = () => {
  cy.get(FLYOUT_ADD_TO_EXISTING_CASE_ITEM).first().click();
};

/**
 * Create a new case by filling out the form from the Cases page
 */
export const createNewCaseFromCases = () => {
  cy.get(CREATE_CASE_BUTTON).click();
  cy.get(NEW_CASE_NAME_INPUT).click().type('case');
  cy.get(NEW_CASE_DESCRIPTION_INPUT).click().type('case description');
  cy.get(NEW_CASE_CREATE_BUTTON).click();
};

/**
 * Create a new case from the Threat Intelligence page
 */
export const createNewCaseFromTI = () => {
  cy.get(NEW_CASE_NAME_INPUT).type('case');
  cy.get(NEW_CASE_DESCRIPTION_INPUT).type('case description');
  cy.get(NEW_CASE_CREATE_BUTTON).click();
};

/**
 * Click on the toaster to navigate to case and verified created case
 */
export const navigateToCaseViaToaster = () => {
  cy.get(VIEW_CASE_TOASTER_LINK).click();
};

/**
 * Delete case from the Cases page
 */
export const deleteCase = () => {
  cy.get(CASE_ACTION_WRAPPER).find(CASE_ELLIPSE_BUTTON).click();
  cy.get(CASE_ELLIPSE_DELETE_CASE_OPTION).click();
  cy.get(CASE_ELLIPSE_DELETE_CASE_CONFIRMATION_BUTTON).click();
};

/**
 * Select existing case from cases modal
 */
export const selectExistingCase = () => {
  cy.get(SELECT_EXISTING_CASES_MODAL).within(() => {
    cy.get(SELECT_CASE_TABLE_ROW).its('length').should('be.gte', 0);
    cy.get(SELECT_EXISTING_CASE).should('exist').contains('Select').click();
  });
};
