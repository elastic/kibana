/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Timeline, TimelineFilter } from '../objects/timeline';

import { ALL_CASES_CREATE_NEW_CASE_TABLE_BTN } from '../screens/all_cases';
import { FIELDS_BROWSER_CHECKBOX } from '../screens/fields_browser';
import { LOADING_INDICATOR } from '../screens/security_header';

import {
  ADD_FILTER,
  ADD_NOTE_BUTTON,
  ATTACH_TIMELINE_TO_CASE_BUTTON,
  ATTACH_TIMELINE_TO_EXISTING_CASE_ICON,
  ATTACH_TIMELINE_TO_NEW_CASE_ICON,
  CLOSE_TIMELINE_BTN,
  COMBO_BOX,
  COMBO_BOX_INPUT,
  CREATE_NEW_TIMELINE,
  DELETE_TIMELINE_BTN,
  DELETION_CONFIRMATION,
  FIELD_BROWSER,
  ID_HEADER_FIELD,
  ID_TOGGLE_FIELD,
  ID_HOVER_ACTION_OVERFLOW_BTN,
  NOTES_TAB_BUTTON,
  NOTES_TEXT_AREA,
  OPEN_TIMELINE_ICON,
  PIN_EVENT,
  RESET_FIELDS,
  SAVE_FILTER_BTN,
  SEARCH_OR_FILTER_CONTAINER,
  SELECT_CASE,
  SERVER_SIDE_EVENT_COUNT,
  STAR_ICON,
  TIMELINE_CHANGES_IN_PROGRESS,
  TIMELINE_DESCRIPTION_INPUT,
  TIMELINE_FIELDS_BUTTON,
  TIMELINE_FILTER_FIELD,
  TIMELINE_FILTER_OPERATOR,
  TIMELINE_FILTER_VALUE,
  TIMELINE_INSPECT_BUTTON,
  TIMELINE_SETTINGS_ICON,
  TIMELINE_TITLE_INPUT,
  TIMELINE_TITLE_BY_ID,
  TIMESTAMP_TOGGLE_FIELD,
  TOGGLE_TIMELINE_EXPAND_EVENT,
  CREATE_NEW_TIMELINE_TEMPLATE,
  OPEN_TIMELINE_TEMPLATE_ICON,
  TIMELINE_EDIT_MODAL_OPEN_BUTTON,
  TIMELINE_EDIT_MODAL_SAVE_BUTTON,
  QUERY_TAB_BUTTON,
  CLOSE_OPEN_TIMELINE_MODAL_BTN,
  TIMELINE_ADD_FIELD_BUTTON,
  TIMELINE_DATA_PROVIDER_FIELD,
  TIMELINE_DATA_PROVIDER_OPERATOR,
  TIMELINE_DATA_PROVIDER_VALUE,
  SAVE_DATA_PROVIDER_BTN,
  EVENT_NOTE,
  TIMELINE_CORRELATION_INPUT,
  TIMELINE_CORRELATION_TAB,
  TIMELINE_CREATE_TIMELINE_FROM_TEMPLATE_BTN,
  TIMELINE_CREATE_TEMPLATE_FROM_TIMELINE_BTN,
  TIMELINE_COLLAPSED_ITEMS_BTN,
  TIMELINE_TAB_CONTENT_EQL,
  TIMESTAMP_HOVER_ACTION_OVERFLOW_BTN,
  PINNED_TAB_BUTTON,
  TIMELINE_DATA_PROVIDER_FIELD_INPUT,
} from '../screens/timeline';
import { REFRESH_BUTTON, TIMELINE } from '../screens/timelines';

import { closeFieldsBrowser, filterFieldsBrowser } from '../tasks/fields_browser';

export const hostExistsQuery = 'host.name: *';

export const addDescriptionToTimeline = (description: string) => {
  cy.get(TIMELINE_EDIT_MODAL_OPEN_BUTTON).first().click();
  cy.get(TIMELINE_DESCRIPTION_INPUT).type(description);
  cy.get(TIMELINE_DESCRIPTION_INPUT).invoke('val').should('equal', description);
  cy.get(TIMELINE_EDIT_MODAL_SAVE_BUTTON).click();
  cy.get(TIMELINE_TITLE_INPUT).should('not.exist');
};

export const addNameToTimeline = (name: string) => {
  cy.get(TIMELINE_EDIT_MODAL_OPEN_BUTTON).first().click();
  cy.get(TIMELINE_TITLE_INPUT).type(`${name}{enter}`);
  cy.get(TIMELINE_TITLE_INPUT).should('have.attr', 'value', name);
  cy.get(TIMELINE_EDIT_MODAL_SAVE_BUTTON).click();
  cy.get(TIMELINE_TITLE_INPUT).should('not.exist');
};

export const addNameAndDescriptionToTimeline = (timeline: Timeline) => {
  cy.get(TIMELINE_EDIT_MODAL_OPEN_BUTTON).first().click();
  cy.get(TIMELINE_TITLE_INPUT).type(`${timeline.title}{enter}`);
  cy.get(TIMELINE_TITLE_INPUT).should('have.attr', 'value', timeline.title);
  cy.get(TIMELINE_DESCRIPTION_INPUT).type(timeline.description);
  cy.get(TIMELINE_DESCRIPTION_INPUT).invoke('val').should('equal', timeline.description);
  cy.get(TIMELINE_EDIT_MODAL_SAVE_BUTTON).click();
  cy.get(TIMELINE_TITLE_INPUT).should('not.exist');
};

export const goToNotesTab = (): Cypress.Chainable<JQuery<HTMLElement>> => {
  cy.root()
    .pipe(($el) => {
      $el.find(NOTES_TAB_BUTTON).trigger('click');
      return $el.find(NOTES_TEXT_AREA);
    })
    .should('exist');
  return cy.root().find(NOTES_TAB_BUTTON);
};

export const goToCorrelationTab = () => {
  cy.root()
    .pipe(($el) => {
      $el.find(TIMELINE_CORRELATION_TAB).trigger('click');
      return $el.find(`${TIMELINE_TAB_CONTENT_EQL} ${TIMELINE_CORRELATION_INPUT}`);
    })
    .should('be.visible');
  return cy.root().find(TIMELINE_CORRELATION_TAB);
};

export const goToQueryTab = () => {
  cy.root()
    .pipe(($el) => {
      $el.find(QUERY_TAB_BUTTON).trigger('click');
      return $el.find(QUERY_TAB_BUTTON);
    })
    .should('have.class', 'euiTab-isSelected');
};

export const goToPinnedTab = () => {
  cy.root()
    .pipe(($el) => {
      $el.find(PINNED_TAB_BUTTON).trigger('click');
      return $el.find(PINNED_TAB_BUTTON);
    })
    .should('have.class', 'euiTab-isSelected');
};

export const addNotesToTimeline = (notes: string) => {
  goToNotesTab().then(() => {
    cy.get(NOTES_TAB_BUTTON)
      .find('.euiBadge__text')
      .then(($el) => {
        const notesCount = parseInt($el.text(), 10);

        cy.get(NOTES_TEXT_AREA).type(notes);
        cy.get(ADD_NOTE_BUTTON).trigger('click');
        cy.get(`${NOTES_TAB_BUTTON} .euiBadge`).should('have.text', `${notesCount + 1}`);
      });
  });
  goToQueryTab();
  goToNotesTab();
};

export const addEqlToTimeline = (eql: string) => {
  goToCorrelationTab().then(() => {
    cy.get(TIMELINE_CORRELATION_INPUT).type(eql);
  });
};

export const addFilter = (filter: TimelineFilter): Cypress.Chainable<JQuery<HTMLElement>> => {
  cy.get(ADD_FILTER).click();
  cy.get(TIMELINE_FILTER_FIELD).type(`${filter.field}{downarrow}{enter}`);
  cy.get(TIMELINE_FILTER_OPERATOR).type(filter.operator);
  cy.get(COMBO_BOX).contains(filter.operator).click();
  if (filter.operator !== 'exists') {
    cy.get(TIMELINE_FILTER_VALUE).type(`${filter.value}{enter}`);
  }
  return cy.get(SAVE_FILTER_BTN).click();
};

export const addDataProvider = (filter: TimelineFilter): Cypress.Chainable<JQuery<HTMLElement>> => {
  cy.get(TIMELINE_ADD_FIELD_BUTTON).click();
  cy.get(LOADING_INDICATOR).should('not.exist');
  cy.get(TIMELINE_DATA_PROVIDER_FIELD)
    .find(TIMELINE_DATA_PROVIDER_FIELD_INPUT)
    .should('have.focus'); // make sure the focus is ready before start typing
  cy.get(TIMELINE_DATA_PROVIDER_FIELD)
    .find(COMBO_BOX_INPUT)
    .type(`${filter.field}{downarrow}{enter}`);
  cy.get(TIMELINE_DATA_PROVIDER_OPERATOR)
    .find(COMBO_BOX_INPUT)
    .type(`${filter.operator}{downarrow}{enter}`);
  if (filter.operator !== 'exists') {
    cy.get(TIMELINE_DATA_PROVIDER_VALUE).type(`${filter.value}{enter}`);
  }
  return cy.get(SAVE_DATA_PROVIDER_BTN).click();
};

export const addNewCase = () => {
  cy.get(ALL_CASES_CREATE_NEW_CASE_TABLE_BTN).click();
};

export const attachTimelineToNewCase = () => {
  cy.get(ATTACH_TIMELINE_TO_CASE_BUTTON).click({ force: true });
  cy.get(ATTACH_TIMELINE_TO_NEW_CASE_ICON).click({ force: true });
};

export const attachTimelineToExistingCase = () => {
  cy.get(ATTACH_TIMELINE_TO_CASE_BUTTON).click({ force: true });
  cy.get(ATTACH_TIMELINE_TO_EXISTING_CASE_ICON).click({ force: true });
};

const clickIdHoverActionOverflowButton = () => {
  cy.get(ID_HOVER_ACTION_OVERFLOW_BTN).should('exist');

  cy.get(ID_HOVER_ACTION_OVERFLOW_BTN).click({ force: true });
};

export const clickIdToggleField = () => {
  clickIdHoverActionOverflowButton();
  cy.get(ID_HEADER_FIELD).should('not.exist');

  cy.get(ID_TOGGLE_FIELD).click({
    force: true,
  });
};

export const closeOpenTimelineModal = () => {
  cy.get(CLOSE_OPEN_TIMELINE_MODAL_BTN).click({ force: true });
};

export const closeTimeline = () => {
  cy.root()
    .pipe(($el) => {
      $el.find(CLOSE_TIMELINE_BTN).filter(':visible').trigger('click');
      return $el.find(QUERY_TAB_BUTTON);
    })
    .should('not.be.visible');
};

export const createNewTimeline = () => {
  cy.get(TIMELINE_SETTINGS_ICON)
    .filter(':visible')
    .pipe(($el) => $el.trigger('click'))
    .should('be.visible');
  cy.wait(300);
  cy.get(CREATE_NEW_TIMELINE)
    .eq(0)
    .pipe(($el) => $el.trigger('click'));
};

export const createNewTimelineTemplate = () => {
  cy.get(TIMELINE_SETTINGS_ICON).filter(':visible').click({ force: true });
  cy.get(CREATE_NEW_TIMELINE_TEMPLATE).click();
};

export const executeTimelineKQL = (query: string) => {
  cy.get(`${SEARCH_OR_FILTER_CONTAINER} textarea`).type(`${query} {enter}`);
};

export const expandFirstTimelineEventDetails = () => {
  cy.get(TOGGLE_TIMELINE_EXPAND_EVENT).first().click({ force: true });
};

export const deleteTimeline = () => {
  cy.get(TIMELINE_COLLAPSED_ITEMS_BTN).click();
  cy.get(DELETE_TIMELINE_BTN).click();
  cy.get(DELETION_CONFIRMATION).click();
};

export const markAsFavorite = () => {
  const click = ($el: Cypress.ObjectLike) => cy.wrap($el).click();
  cy.get(STAR_ICON).should('be.visible').pipe(click);
  cy.get(LOADING_INDICATOR).should('not.exist');
};

export const openTimelineFieldsBrowser = () => {
  cy.get(TIMELINE_FIELDS_BUTTON).first().click({ force: true });
};

export const openTimelineInspectButton = () => {
  cy.get(TIMELINE_INSPECT_BUTTON).should('not.be.disabled');
  cy.get(TIMELINE_INSPECT_BUTTON).trigger('click', { force: true });
};

export const openTimelineFromSettings = () => {
  const click = ($el: Cypress.ObjectLike) => cy.wrap($el).click();
  cy.get(TIMELINE_SETTINGS_ICON).should('be.visible');
  cy.get(TIMELINE_SETTINGS_ICON).filter(':visible').pipe(click);
  cy.get(OPEN_TIMELINE_ICON).should('be.visible');
  cy.get(OPEN_TIMELINE_ICON).pipe(click);
};

export const openTimelineTemplateFromSettings = (id: string) => {
  openTimelineFromSettings();
  cy.get(OPEN_TIMELINE_TEMPLATE_ICON).click({ force: true });
  cy.get(TIMELINE_TITLE_BY_ID(id)).click({ force: true });
};

export const openTimelineById = (timelineId: string): Cypress.Chainable<JQuery<HTMLElement>> => {
  if (timelineId == null) {
    // Log out if for some reason this happens to be null just in case for our tests we experience
    // value of null. Some tests return an "any" which is why this could happen.
    cy.log('"timelineId" is null or undefined');
  }
  // We avoid use cypress.pipe() here and multiple clicks because each of these clicks
  // can result in a new URL async operation occurring and then we get indeterminism as the URL loads multiple times.
  return cy.get(TIMELINE_TITLE_BY_ID(timelineId)).should('be.visible').click({ force: true });
};

export const pinFirstEvent = (): Cypress.Chainable<JQuery<HTMLElement>> => {
  return cy.get(PIN_EVENT).first().click({ force: true });
};

export const persistNoteToFirstEvent = (notes: string) => {
  cy.get(EVENT_NOTE).first().click({ force: true });
  cy.get(NOTES_TEXT_AREA).type(notes);
  cy.root().pipe(($el) => {
    $el.find(ADD_NOTE_BUTTON).trigger('click');
    return $el.find(NOTES_TAB_BUTTON).find('.euiBadge');
  });
};

export const populateTimeline = () => {
  executeTimelineKQL(hostExistsQuery);
  cy.get(SERVER_SIDE_EVENT_COUNT).should('not.have.text', '0');
};

const clickTimestampHoverActionOverflowButton = () => {
  cy.get(TIMESTAMP_HOVER_ACTION_OVERFLOW_BTN).should('exist');

  cy.get(TIMESTAMP_HOVER_ACTION_OVERFLOW_BTN).click({ force: true });
};

export const clickTimestampToggleField = () => {
  clickTimestampHoverActionOverflowButton();

  cy.get(TIMESTAMP_TOGGLE_FIELD).should('exist');

  cy.get(TIMESTAMP_TOGGLE_FIELD).click({ force: true });
};

export const removeColumn = (columnName: string) => {
  cy.get(FIELD_BROWSER).first().click();
  filterFieldsBrowser(columnName);
  cy.get(FIELDS_BROWSER_CHECKBOX(columnName)).click();
  closeFieldsBrowser();
};

export const resetFields = () => {
  cy.get(RESET_FIELDS).click({ force: true });
};

export const selectCase = (caseId: string) => {
  cy.get(SELECT_CASE(caseId)).click();
};

export const waitForTimelineChanges = () => {
  cy.get(TIMELINE_CHANGES_IN_PROGRESS).should('exist');
  cy.get(TIMELINE_CHANGES_IN_PROGRESS).should('not.exist');
};

/**
 * We keep clicking on the refresh button until we have the timeline we are looking
 * for. NOTE: That because refresh happens so fast, the click handler in most cases
 * is not on it reliably. You should not use a pipe off of this to get your timeline
 * clicked as a pipe off the timeline link can product multiple URL loads which will
 * add a different type of flake to your tests. You will usually have to use wait() for
 * this like so:
 *
 * refreshTimelinesUntilTimeLinePresent(timelineId)
 *   // This wait is here because we cannot do a pipe on a timeline as that will introduce multiple URL
 *   // request responses and indeterminism.
 *   .then(() => cy.wait(1000))
 *   .then(() => ... your code here ...)
 * @param id The timeline id to click the refresh button until we find it.
 */
export const refreshTimelinesUntilTimeLinePresent = (
  id: string
): Cypress.Chainable<JQuery<HTMLHtmlElement>> => {
  return cy
    .root()
    .pipe(($el) => {
      $el.find(REFRESH_BUTTON).trigger('click');
      return $el.find(TIMELINE(id));
    })
    .should('be.visible');
};

export const clickingOnCreateTimelineFormTemplateBtn = () => {
  cy.get(TIMELINE_CREATE_TIMELINE_FROM_TEMPLATE_BTN).click({ force: true });
};

export const clickingOnCreateTemplateFromTimelineBtn = () => {
  cy.get(TIMELINE_CREATE_TEMPLATE_FROM_TIMELINE_BTN).click({ force: true });
};

export const expandEventAction = () => {
  cy.waitUntil(() => {
    cy.get(TIMELINE_COLLAPSED_ITEMS_BTN).should('exist');
    cy.get(TIMELINE_COLLAPSED_ITEMS_BTN).should('be.visible');
    return cy.get(TIMELINE_COLLAPSED_ITEMS_BTN).then(($el) => $el.length === 1);
  });
  cy.get(TIMELINE_COLLAPSED_ITEMS_BTN).click();
};

export const setKibanaTimezoneToUTC = () =>
  cy
    .request({
      method: 'POST',
      url: 'api/kibana/settings',
      body: { changes: { 'dateFormat:tz': 'UTC' } },
      headers: { 'kbn-xsrf': 'set-kibana-timezone-utc' },
    })
    .then(() => {
      cy.reload();
    });
