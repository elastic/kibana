/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  BULK_ACTIONS,
  EXPORT_TIMELINE,
  TIMELINE_CHECKBOX,
  EXPAND_NOTES_BTN,
  EXPORT_TIMELINE_ACTION,
  IMPORT_BTN,
  IMPORT_TIMELINE_BTN,
  INPUT_FILE,
  TIMELINES_TABLE,
  TIMELINE,
  TIMELINE_NAME,
  TIMELINE_ITEM_ACTION_BTN,
} from '../screens/timelines';
import { SELECT_ALL_CHECKBOX } from '../screens/shared';

export const expandNotes = () => {
  cy.get(EXPAND_NOTES_BTN).click();
};

export const importTimeline = (timeline: string) => {
  cy.get(IMPORT_TIMELINE_BTN).click();
  cy.get(INPUT_FILE).should('exist');
  cy.get(INPUT_FILE).trigger('click', { force: true }).attachFile(timeline).trigger('change');
  cy.get(IMPORT_BTN).last().click({ force: true });
  cy.get(INPUT_FILE).should('not.exist');
};

export const openTimeline = (id?: string) => {
  const click = ($el: Cypress.ObjectLike) => cy.wrap($el).click();
  if (id) {
    cy.get(TIMELINE(id)).should('be.visible').pipe(click);
  } else {
    cy.get(TIMELINE_NAME).should('be.visible').pipe(click);
  }
};

export const waitForTimelinesPanelToBeLoaded = () => {
  cy.get(TIMELINES_TABLE).should('exist');
};

export const exportTimeline = (timelineId: string) => {
  cy.get(TIMELINE_ITEM_ACTION_BTN(timelineId)).click();
  cy.get(EXPORT_TIMELINE).click();
};

export const selectTimeline = (timelineId: string) => {
  cy.get(TIMELINE_CHECKBOX(timelineId)).click();
};

export const selectAllTimelines = () => {
  cy.get(SELECT_ALL_CHECKBOX).should('exist');
  cy.get(SELECT_ALL_CHECKBOX).click();
};

export const exportSelectedTimelines = () => {
  cy.get(BULK_ACTIONS).click();
  cy.get(EXPORT_TIMELINE_ACTION).should('not.be.disabled');
  cy.get(EXPORT_TIMELINE_ACTION).click();
};
