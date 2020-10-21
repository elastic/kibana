/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { TimelineFilter } from '../objects/timeline';

import { ALL_CASES_CREATE_NEW_CASE_TABLE_BTN } from '../screens/all_cases';

import {
  ADD_FILTER,
  ADD_NOTE_BUTTON,
  ATTACH_TIMELINE_TO_EXISTING_CASE_ICON,
  ATTACH_TIMELINE_TO_NEW_CASE_ICON,
  CASE,
  CLOSE_TIMELINE_BTN,
  CLOSE_NOTES_BTN,
  COMBO_BOX,
  CREATE_NEW_TIMELINE,
  HEADER,
  ID_FIELD,
  ID_HEADER_FIELD,
  ID_TOGGLE_FIELD,
  NOTES_BUTTON,
  NOTES_TEXT_AREA,
  OPEN_TIMELINE_ICON,
  PIN_EVENT,
  REMOVE_COLUMN,
  RESET_FIELDS,
  SAVE_FILTER_BTN,
  SEARCH_OR_FILTER_CONTAINER,
  SERVER_SIDE_EVENT_COUNT,
  STAR_ICON,
  TIMELINE_CHANGES_IN_PROGRESS,
  TIMELINE_DESCRIPTION,
  TIMELINE_FIELDS_BUTTON,
  TIMELINE_FILTER_FIELD,
  TIMELINE_FILTER_OPERATOR,
  TIMELINE_FILTER_VALUE,
  TIMELINE_INSPECT_BUTTON,
  TIMELINE_SETTINGS_ICON,
  TIMELINE_TITLE,
  TIMELINE_TITLE_BY_ID,
  TIMESTAMP_TOGGLE_FIELD,
  TOGGLE_TIMELINE_EXPAND_EVENT,
  CREATE_NEW_TIMELINE_TEMPLATE,
  OPEN_TIMELINE_TEMPLATE_ICON,
} from '../screens/timeline';
import { TIMELINES_TABLE } from '../screens/timelines';

import { drag, drop } from '../tasks/common';

export const hostExistsQuery = 'host.name: *';

export const addDescriptionToTimeline = (description: string) => {
  cy.get(TIMELINE_DESCRIPTION).type(`${description}{enter}`);
  cy.get(TIMELINE_DESCRIPTION).should('have.attr', 'value', description);
};

export const addNameToTimeline = (name: string) => {
  cy.get(TIMELINE_TITLE).type(`${name}{enter}`);
  cy.get(TIMELINE_TITLE).should('have.attr', 'value', name);
};

export const addNotesToTimeline = (notes: string) => {
  cy.get(NOTES_BUTTON).click();
  cy.get(NOTES_TEXT_AREA).type(notes);
  cy.get(ADD_NOTE_BUTTON).click();
};

export const addFilter = (filter: TimelineFilter) => {
  cy.get(ADD_FILTER).click();
  cy.get(TIMELINE_FILTER_FIELD).type(`${filter.field}{downarrow}{enter}`);
  cy.get(TIMELINE_FILTER_OPERATOR).type(filter.operator);
  cy.get(COMBO_BOX).contains(filter.operator).click();
  if (filter.operator !== 'exists') {
    cy.get(TIMELINE_FILTER_VALUE).type(`${filter.value}{enter}`);
  }
  cy.get(SAVE_FILTER_BTN).click();
};

export const addNewCase = () => {
  cy.get(ALL_CASES_CREATE_NEW_CASE_TABLE_BTN).click();
};

export const attachTimelineToNewCase = () => {
  cy.get(TIMELINE_SETTINGS_ICON).click({ force: true });
  cy.get(ATTACH_TIMELINE_TO_NEW_CASE_ICON).click({ force: true });
};

export const attachTimelineToExistingCase = () => {
  cy.get(TIMELINE_SETTINGS_ICON).click({ force: true });
  cy.get(ATTACH_TIMELINE_TO_EXISTING_CASE_ICON).click({ force: true });
};

export const checkIdToggleField = () => {
  cy.get(ID_HEADER_FIELD).should('not.exist');

  cy.get(ID_TOGGLE_FIELD).check({
    force: true,
  });
};

export const closeNotes = () => {
  cy.get(CLOSE_NOTES_BTN).click();
};

export const closeTimeline = () => {
  cy.get(CLOSE_TIMELINE_BTN).click({ force: true });
};

export const createNewTimeline = () => {
  cy.get(TIMELINE_SETTINGS_ICON).click({ force: true });
  cy.get(CREATE_NEW_TIMELINE).click();
  cy.get(CLOSE_TIMELINE_BTN).click({ force: true });
};

export const createNewTimelineTemplate = () => {
  cy.get(TIMELINE_SETTINGS_ICON).click({ force: true });
  cy.get(CREATE_NEW_TIMELINE_TEMPLATE).click();
};

export const executeTimelineKQL = (query: string) => {
  cy.get(`${SEARCH_OR_FILTER_CONTAINER} textarea`).type(`${query} {enter}`);
};

export const expandFirstTimelineEventDetails = () => {
  cy.get(TOGGLE_TIMELINE_EXPAND_EVENT).first().click({ force: true });
};

export const markAsFavorite = () => {
  cy.get(STAR_ICON).click();
};

export const openTimelineFieldsBrowser = () => {
  cy.get(TIMELINE_FIELDS_BUTTON).click({ force: true });
};

export const openTimelineInspectButton = () => {
  cy.get(TIMELINE_INSPECT_BUTTON).should('not.be.disabled');
  cy.get(TIMELINE_INSPECT_BUTTON).trigger('click', { force: true });
};

export const openTimelineFromSettings = () => {
  cy.get(TIMELINE_SETTINGS_ICON).click({ force: true });
  cy.get(OPEN_TIMELINE_ICON).click({ force: true });
};

export const openTimelineTemplateFromSettings = (id: string) => {
  openTimelineFromSettings();
  cy.get(OPEN_TIMELINE_TEMPLATE_ICON).click({ force: true });
  cy.get(TIMELINE_TITLE_BY_ID(id)).click({ force: true });
};

export const openTimelineSettings = () => {
  cy.get(TIMELINE_SETTINGS_ICON).trigger('click', { force: true });
};

export const pinFirstEvent = () => {
  cy.get(PIN_EVENT).first().click({ force: true });
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

export const unpinFirstEvent = () => {
  cy.get(PIN_EVENT).first().click({ force: true });
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
  cy.get(HEADER).eq(column).click();
  cy.get(REMOVE_COLUMN).eq(column).click({ force: true });
};

export const resetFields = () => {
  cy.get(RESET_FIELDS).click({ force: true });
};

export const selectCase = (caseId: string) => {
  cy.get(CASE(caseId)).click();
};

export const waitForTimelineChanges = () => {
  cy.get(TIMELINE_CHANGES_IN_PROGRESS).should('exist');
  cy.get(TIMELINE_CHANGES_IN_PROGRESS).should('not.exist');
};

export const waitForTimelinesPanelToBeLoaded = () => {
  cy.get(TIMELINES_TABLE).should('exist');
};
