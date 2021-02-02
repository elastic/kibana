/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { timeline } from '../../objects/timeline';

import { TIMELINE_DESCRIPTION, TIMELINE_TITLE, OPEN_TIMELINE_MODAL } from '../../screens/timeline';
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
  addFilter,
  addNameAndDescriptionToTimeline,
  addNotesToTimeline,
  closeOpenTimelineModal,
  closeTimeline,
  markAsFavorite,
  openTimelineFromSettings,
  pinFirstEvent,
  populateTimeline,
  waitForTimelineChanges,
} from '../../tasks/timeline';

import { OVERVIEW_URL } from '../../urls/navigation';

describe('Open timeline', () => {
  before(() => {
    cleanKibana();
    loginAndWaitForPage(OVERVIEW_URL);

    openTimelineUsingToggle();
    addNameAndDescriptionToTimeline(timeline);

    populateTimeline();
    addFilter(timeline.filter);
    pinFirstEvent();
    addNotesToTimeline(timeline.notes);
    markAsFavorite();
    waitForTimelineChanges();
    closeTimeline();
  });

  describe('Open timeline modal', () => {
    before(() => {
      openTimelineFromSettings();
    });

    after(() => {
      closeOpenTimelineModal();
    });

    it('should open a modal', () => {
      cy.get(OPEN_TIMELINE_MODAL).should('be.visible');
    });

    it('should display timeline info - title', () => {
      cy.contains(timeline.title).should('exist');
    });

    it('should display timeline info - description', () => {
      cy.get(TIMELINES_DESCRIPTION).first().should('have.text', timeline.description);
    });

    it('should display timeline info - pinned event count', () => {
      cy.get(TIMELINES_PINNED_EVENT_COUNT).first().should('have.text', '1');
    });

    it('should display timeline info - notes count', () => {
      cy.get(TIMELINES_NOTES_COUNT).first().should('have.text', '1');
    });

    it('should display timeline info - favorite timeline', () => {
      cy.get(TIMELINES_FAVORITE).first().should('exist');
    });

    it('should display timeline content - title', () => {
      cy.get(TIMELINE_TITLE).should('have.text', timeline.title);
    });

    it('should display timeline content - description', () => {
      cy.get(TIMELINE_DESCRIPTION).should('have.text', timeline.description); // This is the flake part where it sometimes does not show/load the timelines correctly
    });
  });
});
