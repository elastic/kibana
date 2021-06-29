/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { drag, drop } from '../tasks/common';

import {
  FIELDS_BROWSER_FILTER_INPUT,
  FIELDS_BROWSER_DRAGGABLE_HOST_GEO_COUNTRY_NAME_HEADER,
  FIELDS_BROWSER_HEADER_DROP_AREA,
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

export const addsHostGeoCountryNameToTimelineDraggingIt = () => {
  cy.get(FIELDS_BROWSER_DRAGGABLE_HOST_GEO_COUNTRY_NAME_HEADER).should('exist');
  cy.get(FIELDS_BROWSER_DRAGGABLE_HOST_GEO_COUNTRY_NAME_HEADER).then((field) => drag(field));

  cy.get(FIELDS_BROWSER_HEADER_DROP_AREA)
    .first()
    .then((headersDropArea) => drop(headersDropArea));
};

export const clearFieldsBrowser = () => {
  cy.get(FIELDS_BROWSER_FILTER_INPUT).type('{selectall}{backspace}');
};

export const closeFieldsBrowser = () => {
  cy.get(CLOSE_BTN).click({ force: true });
};

export const filterFieldsBrowser = (fieldName: string) => {
  cy.get(FIELDS_BROWSER_FILTER_INPUT)
    .type(fieldName)
    .should('not.have.class', 'euiFieldSearch-isLoading');
};

export const removesMessageField = () => {
  cy.get(FIELDS_BROWSER_MESSAGE_CHECKBOX).uncheck({
    force: true,
  });
};

export const resetFields = () => {
  cy.get(FIELDS_BROWSER_RESET_FIELDS).click({ force: true });
};
