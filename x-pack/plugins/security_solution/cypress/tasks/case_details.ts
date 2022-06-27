/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TIMELINE_TITLE } from '../screens/timeline';
import {
  CASE_ACTIONS,
  CASE_DELETE,
  CASE_DETAILS_TIMELINE_LINK_MARKDOWN,
  DELETE_CASE_CONFIRM_BUTTON,
} from '../screens/case_details';

export const deleteCase = () => {
  cy.get(CASE_ACTIONS).first().click({ force: true });
  cy.get(CASE_DELETE).click({ force: true });
  cy.get(DELETE_CASE_CONFIRM_BUTTON).click({ force: true });
};

export const openCaseTimeline = () => {
  cy.get(CASE_DETAILS_TIMELINE_LINK_MARKDOWN).click();
  cy.get(TIMELINE_TITLE).should('exist');
};
