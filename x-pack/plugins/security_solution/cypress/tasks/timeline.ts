/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { DATE_PICKER_APPLY_BUTTON_TIMELINE } from '../screens/date_picker';

import {
  CLOSE_TIMELINE_BTN,
  CREATE_NEW_TIMELINE,
  ID_FIELD,
  ID_HEADER_FIELD,
  ID_TOGGLE_FIELD,
  SEARCH_OR_FILTER_CONTAINER,
  SERVER_SIDE_EVENT_COUNT,
  TIMELINE_DESCRIPTION,
  TIMELINE_FIELDS_BUTTON,
  TIMELINE_INSPECT_BUTTON,
  TIMELINE_SETTINGS_ICON,
  TIMELINE_TITLE,
  TIMESTAMP_TOGGLE_FIELD,
  TOGGLE_TIMELINE_EXPAND_EVENT,
  REMOVE_COLUMN,
  RESET_FIELDS,
} from '../screens/timeline';

import { drag, drop } from '../tasks/common';

export const hostExistsQuery = 'host.name: *';

export const addDescriptionToTimeline = (description: string) => {
  cy.get(TIMELINE_DESCRIPTION).type(`${description}{enter}`);
  cy.get(DATE_PICKER_APPLY_BUTTON_TIMELINE).click().invoke('text').should('not.equal', 'Updating');
};

export const addNameToTimeline = (name: string) => {
  cy.get(TIMELINE_TITLE).type(`${name}{enter}`);
  cy.get(TIMELINE_TITLE).should('have.attr', 'value', name);
};

export const checkIdToggleField = () => {
  cy.get(ID_HEADER_FIELD).should('not.exist');

  cy.get(ID_TOGGLE_FIELD).check({
    force: true,
  });
};

export const closeTimeline = () => {
  cy.get(CLOSE_TIMELINE_BTN).click({ force: true });
};

export const createNewTimeline = () => {
  cy.get(TIMELINE_SETTINGS_ICON).click({ force: true });
  cy.get(CREATE_NEW_TIMELINE).click();
  cy.get(CLOSE_TIMELINE_BTN).click({ force: true });
};

export const executeTimelineKQL = (query: string) => {
  cy.get(`${SEARCH_OR_FILTER_CONTAINER} textarea`).type(`${query} {enter}`);
};

export const expandFirstTimelineEventDetails = () => {
  cy.get(TOGGLE_TIMELINE_EXPAND_EVENT).first().click({ force: true });
};

export const openTimelineFieldsBrowser = () => {
  cy.get(TIMELINE_FIELDS_BUTTON).click({ force: true });
};

export const openTimelineInspectButton = () => {
  cy.get(TIMELINE_INSPECT_BUTTON).should('not.be.disabled');
  cy.get(TIMELINE_INSPECT_BUTTON).trigger('click', { force: true });
};

export const openTimelineSettings = () => {
  cy.get(TIMELINE_SETTINGS_ICON).trigger('click', { force: true });
};

export const populateTimeline = () => {
  executeTimelineKQL(hostExistsQuery);
  cy.get(SERVER_SIDE_EVENT_COUNT)
    .invoke('text')
    .then((strCount) => {
      const intCount = +strCount;
      cy.wrap(intCount).should('be.above', 0);
    });
};

export const uncheckTimestampToggleField = () => {
  cy.get(TIMESTAMP_TOGGLE_FIELD).should('exist');

  cy.get(TIMESTAMP_TOGGLE_FIELD).uncheck({ force: true });
};

export const dragAndDropIdToggleFieldToTimeline = () => {
  cy.get(ID_HEADER_FIELD).should('not.exist');

  cy.get(ID_FIELD).then((field) => drag(field));

  cy.get(`[data-test-subj="timeline"] [data-test-subj="headers-group"]`).then((headersDropArea) =>
    drop(headersDropArea)
  );
};

export const removeColumn = (column: number) => {
  cy.get(REMOVE_COLUMN).first().should('exist');
  cy.get(REMOVE_COLUMN).eq(column).click({ force: true });
};

export const resetFields = () => {
  cy.get(RESET_FIELDS).click({ force: true });
};
