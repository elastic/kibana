/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { timeline } from '../objects/timeline';

import { TIMELINES } from '../screens/security_header';
import {
  FAVORITE_TIMELINE,
  LOCKED_ICON,
  NOTES,
  NOTES_BUTTON,
  NOTES_COUNT,
  NOTES_TEXT_AREA,
  PIN_EVENT,
  TIMELINE_DESCRIPTION,
  // TIMELINE_FILTER,
  TIMELINE_QUERY,
  TIMELINE_TITLE,
} from '../screens/timeline';
import {
  TIMELINES_DESCRIPTION,
  TIMELINES_USERNAME,
  TIMELINES_PINNED_EVENT_COUNT,
  TIMELINES_NOTES_COUNT,
  TIMELINES_FAVORITE,
} from '../screens/timelines';

import { loginAndWaitForPage } from '../tasks/login';
import { navigateFromHeaderTo } from '../tasks/security_header';
import { openTimelineUsingToggle } from '../tasks/security_main';
import {
  addDescriptionToTimeline,
  addFilter,
  addNameToTimeline,
  addNotesToTimeline,
  closeNotes,
  closeTimeline,
  createNewTimeline,
  markAsFavorite,
  pinFirstEvent,
  populateTimeline,
  waitForTimelineChanges,
} from '../tasks/timeline';
import { openTimeline } from '../tasks/timelines';

import { OVERVIEW_URL } from '../urls/navigation';

describe('Timelines', () => {
  it('Creates a timeline', () => {
    loginAndWaitForPage(OVERVIEW_URL);
    openTimelineUsingToggle();

    cy.server();
    cy.route('POST', '**/api/solutions/security/graphql').as('persistTimeline');

    populateTimeline();

    cy.wait('@persistTimeline');
    cy.wait('@persistTimeline');

    pinFirstEvent();

    cy.wait('@persistTimeline', { timeout: 10000 }).then((response) => {
      cy.wrap(response.status).should('eql', 200);
      cy.wrap(response.xhr.responseText).should('include', 'persistPinnedEventOnTimeline');
    });

    cy.get(PIN_EVENT).should('have.attr', 'aria-label', 'Pinned event');
    cy.get(LOCKED_ICON).should('be.visible');

    addNameToTimeline(timeline.title);
    addDescriptionToTimeline(timeline.description);
    addNotesToTimeline(timeline.notes);
    closeNotes();
    addFilter(timeline.filter);
    markAsFavorite();
    waitForTimelineChanges();
    createNewTimeline();
    closeTimeline();
    navigateFromHeaderTo(TIMELINES);

    cy.contains(timeline.title).should('exist');
    cy.get(TIMELINES_DESCRIPTION).first().should('have.text', timeline.description);
    cy.get(TIMELINES_USERNAME).first().should('have.text', 'elastic');
    cy.get(TIMELINES_PINNED_EVENT_COUNT).first().should('have.text', '1');
    cy.get(TIMELINES_NOTES_COUNT).first().should('have.text', '1');
    cy.get(TIMELINES_FAVORITE).first().should('exist');

    openTimeline(timeline.title);

    cy.get(FAVORITE_TIMELINE).should('exist');
    cy.get(TIMELINE_TITLE).should('have.attr', 'value', timeline.title);
    cy.get(TIMELINE_DESCRIPTION).should('have.attr', 'value', timeline.description);
    cy.get(TIMELINE_QUERY).should('have.text', timeline.query);
    // Comments this assertion until we agreed what to do with the filters.
    // cy.get(TIMELINE_FILTER(timeline.filter)).should('exist');
    cy.get(NOTES_COUNT).should('have.text', '1');
    cy.get(PIN_EVENT).should('have.attr', 'aria-label', 'Pinned event');
    cy.get(NOTES_BUTTON).click();
    cy.get(NOTES_TEXT_AREA).should('have.attr', 'placeholder', 'Add a Note');
    cy.get(NOTES).should('have.text', timeline.notes);
  });
});
