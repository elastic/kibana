/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { TIMELINE_TITLE } from '../screens/timeline';
import {
  CASE_ACTIONS_BTN,
  CASE_DETAILS_TIMELINE_LINK_MARKDOWN,
  DELETE_CASE_BTN,
  DELETE_CASE_CONFIRMATION_BTN,
} from '../screens/case_details';

export const deleteCase = () => {
  cy.get(CASE_ACTIONS_BTN).first().click();
  cy.get(DELETE_CASE_BTN).click();
  cy.get(DELETE_CASE_CONFIRMATION_BTN).click();
};

export const openCaseTimeline = () => {
  cy.get(CASE_DETAILS_TIMELINE_LINK_MARKDOWN).click();
  cy.get(TIMELINE_TITLE).should('exist');
};
