/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { timeline } from '../../objects/timeline';

import {
  FAVORITE_TIMELINE,
  LOCKED_ICON,
  NOTES,
  NOTES_TAB_BUTTON,
  // NOTES_COUNT,
  NOTES_TEXT_AREA,
  PIN_EVENT,
  TIMELINE_DESCRIPTION,
  TIMELINE_QUERY,
  TIMELINE_TITLE,
} from '../../screens/timeline';
import {
  TIMELINES_DESCRIPTION,
  TIMELINES_PINNED_EVENT_COUNT,
  TIMELINES_NOTES_COUNT,
  TIMELINES_FAVORITE,
} from '../../screens/timelines';
import { cleanKibana } from '../../tasks/common';

import { loginAndWaitForPage } from '../../tasks/login';
import { openTimelineUsingToggle } from '../../tasks/security_main';
import {
  addDescriptionToTimeline,
  addFilter,
  addNameToTimeline,
  addNotesToTimeline,
  closeTimeline,
  createNewTimelineTemplate,
  markAsFavorite,
  openTimelineTemplateFromSettings,
  populateTimeline,
  waitForTimelineChanges,
} from '../../tasks/timeline';
import { openTimeline } from '../../tasks/timelines';

import { OVERVIEW_URL } from '../../urls/navigation';

describe('Timeline Templates', () => {
  beforeEach(() => {
    cleanKibana();
    cy.intercept('PATCH', '/api/timeline').as('timeline');
  });

  it('Creates a timeline template', async () => {
    loginAndWaitForPage(OVERVIEW_URL);
    openTimelineUsingToggle();
    createNewTimelineTemplate();
    populateTimeline();
    addFilter(timeline.filter);
    cy.get(PIN_EVENT).should(
      'have.attr',
      'aria-label',
      'This event may not be pinned while editing a template timeline'
    );
    cy.get(LOCKED_ICON).should('be.visible');

    addNameToTimeline(timeline.title);

    cy.wait('@timeline').then(({ response }) => {
      const timelineId = response!.body.data.persistTimeline.timeline.savedObjectId;

      addDescriptionToTimeline(timeline.description);
      addNotesToTimeline(timeline.notes);
      markAsFavorite();
      waitForTimelineChanges();
      createNewTimelineTemplate();
      closeTimeline();
      openTimelineTemplateFromSettings(timelineId);

      cy.contains(timeline.title).should('exist');
      cy.get(TIMELINES_DESCRIPTION).first().should('have.text', timeline.description);
      cy.get(TIMELINES_PINNED_EVENT_COUNT).first().should('have.text', '1');
      cy.get(TIMELINES_NOTES_COUNT).first().should('have.text', '1');
      cy.get(TIMELINES_FAVORITE).first().should('exist');

      openTimeline(timelineId);

      cy.get(FAVORITE_TIMELINE).should('exist');
      cy.get(TIMELINE_TITLE).should('have.text', timeline.title);
      cy.get(TIMELINE_DESCRIPTION).should('have.text', timeline.description);
      cy.get(TIMELINE_QUERY).should('have.text', timeline.query);
      // Comments this assertion until we agreed what to do with the filters.
      // cy.get(TIMELINE_FILTER(timeline.filter)).should('exist');
      // cy.get(NOTES_COUNT).should('have.text', '1');
      cy.get(NOTES_TAB_BUTTON).click();
      cy.get(NOTES_TEXT_AREA).should('exist');
      cy.get(NOTES).should('have.text', timeline.notes);
    });
  });
});
