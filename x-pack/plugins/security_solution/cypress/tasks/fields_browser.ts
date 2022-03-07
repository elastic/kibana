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
  FIELDS_BROWSER_CATEGORIES_FILTER_BUTTON,
  FIELDS_BROWSER_CATEGORY_FILTER_OPTION,
  FIELDS_BROWSER_CATEGORIES_FILTER_SEARCH,
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
  cy.get(FIELDS_BROWSER_FILTER_INPUT)
    .type('{selectall}{backspace}')
    .waitUntil((subject) => !subject.hasClass('euiFieldSearch-isLoading'));
};

export const closeFieldsBrowser = () => {
  cy.get(CLOSE_BTN).click({ force: true });
  cy.get(FIELDS_BROWSER_FILTER_INPUT).should('not.exist');
};

export const filterFieldsBrowser = (fieldName: string) => {
  cy.get(FIELDS_BROWSER_FILTER_INPUT)
    .clear()
    .type(fieldName)
    .waitUntil((subject) => !subject.hasClass('euiFieldSearch-isLoading'));
};

export const toggleCategoryFilter = () => {
  cy.get(FIELDS_BROWSER_CATEGORIES_FILTER_BUTTON).click({ force: true });
};

export const toggleCategory = (category: string) => {
  toggleCategoryFilter();
  cy.get(FIELDS_BROWSER_CATEGORIES_FILTER_SEARCH).clear().type(category);
  cy.get(FIELDS_BROWSER_CATEGORY_FILTER_OPTION(category)).click({ force: true });
  toggleCategoryFilter();
};

export const removesMessageField = () => {
  cy.get(FIELDS_BROWSER_MESSAGE_CHECKBOX).uncheck({
    force: true,
  });
};

export const resetFields = () => {
  cy.get(FIELDS_BROWSER_RESET_FIELDS).click({ force: true });
};
