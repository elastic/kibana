/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TIMELINE_TITLE } from '../screens/timeline';
import {
  CASE_ACTIONS_BTN,
  CASE_CONFLICT_CALL_OUT_DISMISS,
  CASE_CONFLICT_CALL_OUT_REDIRECT,
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

export const dismissConflict = () => {
  cy.get(CASE_CONFLICT_CALL_OUT_DISMISS).click();
};

export const redirectConflict = () => {
  cy.get(CASE_CONFLICT_CALL_OUT_REDIRECT).click();
};
