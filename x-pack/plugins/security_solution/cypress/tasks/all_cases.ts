/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  ALL_CASES_NAME,
  ALL_CASES_CREATE_NEW_CASE_BTN,
  EDIT_EXTERNAL_CONNECTION,
} from '../screens/all_cases';

export const goToCreateNewCase = () => {
  cy.get(ALL_CASES_CREATE_NEW_CASE_BTN).click({ force: true });
};

export const goToCaseDetails = () => {
  cy.get(ALL_CASES_NAME).click({ force: true });
};

export const goToEditExternalConnection = () => {
  cy.get(EDIT_EXTERNAL_CONNECTION).click({ force: true });
};
