/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { TestCase } from '../objects/case';

import {
  BACK_TO_CASES_BTN,
  DESCRIPTION_INPUT,
  SUBMIT_BTN,
  INSERT_TIMELINE_BTN,
  LOADING_SPINNER,
  TAGS_INPUT,
  TIMELINE,
  TIMELINE_SEARCHBOX,
  TITLE_INPUT,
} from '../screens/create_new_case';

export const backToCases = () => {
  cy.get(BACK_TO_CASES_BTN).click({ force: true });
};

export const createNewCase = (newCase: TestCase) => {
  cy.get(TITLE_INPUT).type(newCase.name, { force: true });
  newCase.tags.forEach((tag) => {
    cy.get(TAGS_INPUT).type(`${tag}{enter}`, { force: true });
  });
  cy.get(DESCRIPTION_INPUT).type(`${newCase.description} `, { force: true });

  cy.get(INSERT_TIMELINE_BTN).click({ force: true });
  cy.get(TIMELINE_SEARCHBOX).type(`${newCase.timeline.title}{enter}`);
  cy.get(TIMELINE).should('be.visible');
  cy.wait(300);
  cy.get(TIMELINE).eq(1).click({ force: true });

  cy.get(SUBMIT_BTN).click({ force: true });
  cy.get(LOADING_SPINNER).should('exist');
  cy.get(LOADING_SPINNER).should('not.exist');
};
