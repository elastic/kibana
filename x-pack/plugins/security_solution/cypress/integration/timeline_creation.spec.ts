/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { timeline } from '../objects/timeline';

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
  TIMELINES_PINNED_EVENT_COUNT,
  TIMELINES_NOTES_COUNT,
  TIMELINES_FAVORITE,
} from '../screens/timelines';

import { loginAndWaitForPage } from '../tasks/login';
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
  openTimelineFromSettings,
  pinFirstEvent,
  populateTimeline,
  waitForTimelineChanges,
} from '../tasks/timeline';
import { openTimeline } from '../tasks/timelines';

import { OVERVIEW_URL } from '../urls/navigation';

// FLAKY: https://github.com/elastic/kibana/issues/79389
describe.skip('Timelines', () => {
  before(() => {
    cy.route2('PATCH', '/api/timeline').as('timeline');
  });

  it('Creates a timeline', async () => {
    loginAndWaitForPage(OVERVIEW_URL);
    openTimelineUsingToggle();
    populateTimeline();
    addFilter(timeline.filter);
    pinFirstEvent();

    cy.get(PIN_EVENT).should('have.attr', 'aria-label', 'Pinned event');
    cy.get(LOCKED_ICON).should('be.visible');

    addNameToTimeline(timeline.title);

    const { response } = await cy.wait('@timeline').promisify();
    const timelineId = JSON.parse(response.body as string).data.persistTimeline.timeline
      .savedObjectId;

    addDescriptionToTimeline(timeline.description);
    addNotesToTimeline(timeline.notes);
    closeNotes();
    markAsFavorite();
    waitForTimelineChanges();
    createNewTimeline();
    closeTimeline();
    openTimelineFromSettings();

    cy.contains(timeline.title).should('exist');
    cy.get(TIMELINES_DESCRIPTION).first().should('have.text', timeline.description);
    cy.get(TIMELINES_PINNED_EVENT_COUNT).first().should('have.text', '1');
    cy.get(TIMELINES_NOTES_COUNT).first().should('have.text', '1');
    cy.get(TIMELINES_FAVORITE).first().should('exist');

    openTimeline(timelineId);

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
