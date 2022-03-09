/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  FIELDS_BROWSER_FILTER_INPUT,
  FIELDS_BROWSER_HOST_GEO_CITY_NAME_CHECKBOX,
  FIELDS_BROWSER_HOST_GEO_CONTINENT_NAME_CHECKBOX,
  FIELDS_BROWSER_MESSAGE_CHECKBOX,
  FIELDS_BROWSER_RESET_FIELDS,
  FIELDS_BROWSER_CHECKBOX,
  CLOSE_BTN,
} from '../screens/fields_browser';

export const addsFields = (fields: string[]) => {
  fields.forEach((field) => {
    cy.get(FIELDS_BROWSER_CHECKBOX(field)).click();
  });
};

export const addsHostGeoCityNameToTimeline = () => {
  cy.get(FIELDS_BROWSER_HOST_GEO_CITY_NAME_CHECKBOX).check({
    force: true,
  });
};

export const addsHostGeoContinentNameToTimeline = () => {
  cy.get(FIELDS_BROWSER_HOST_GEO_CONTINENT_NAME_CHECKBOX).check({
    force: true,
  });
};

export const clearFieldsBrowser = () => {
  cy.clock();
  cy.get(FIELDS_BROWSER_FILTER_INPUT).type('{selectall}{backspace}');
  cy.wait(0);
  cy.tick(1000);
};

export const closeFieldsBrowser = () => {
  cy.get(CLOSE_BTN).click({ force: true });
  cy.get(FIELDS_BROWSER_FILTER_INPUT).should('not.exist');
};

export const filterFieldsBrowser = (fieldName: string) => {
  cy.clock();
  cy.get(FIELDS_BROWSER_FILTER_INPUT).type(fieldName, { delay: 50 });
  cy.wait(0);
  cy.tick(1000);
  // the text filter is debounced by 250 ms, wait 1s for changes to be applied
  cy.get(FIELDS_BROWSER_FILTER_INPUT).should('not.have.class', 'euiFieldSearch-isLoading');
};

export const removesMessageField = () => {
  cy.get(FIELDS_BROWSER_MESSAGE_CHECKBOX).uncheck({
    force: true,
  });
};

export const resetFields = () => {
  cy.get(FIELDS_BROWSER_RESET_FIELDS).click({ force: true });
};
