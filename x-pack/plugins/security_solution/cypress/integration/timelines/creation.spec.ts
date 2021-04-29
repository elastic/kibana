/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { timeline } from '../../objects/timeline';

import {
  FAVORITE_TIMELINE,
  LOCKED_ICON,
  NOTES_TEXT,
  PIN_EVENT,
  TIMELINE_FILTER,
  TIMELINE_PANEL,
} from '../../screens/timeline';

import { cleanKibana } from '../../tasks/common';

import { loginAndWaitForPage } from '../../tasks/login';
import { openTimelineUsingToggle } from '../../tasks/security_main';
import {
  addFilter,
  addNameAndDescriptionToTimeline,
  addNotesToTimeline,
  closeTimeline,
  createNewTimeline,
  goToQueryTab,
  markAsFavorite,
  pinFirstEvent,
  populateTimeline,
  waitForTimelineChanges,
} from '../../tasks/timeline';

import { OVERVIEW_URL } from '../../urls/navigation';

describe('Timelines', (): void => {
  before(() => {
    cleanKibana();
    loginAndWaitForPage(OVERVIEW_URL);
  });

  describe('Toggle create timeline from plus icon', () => {
    after(() => {
      closeTimeline();
    });

    it('toggle create timeline ', () => {
      createNewTimeline();
      cy.get(TIMELINE_PANEL).should('be.visible');
    });
  });

  describe('Creates a timeline by clicking untitled timeline from bottom bar', () => {
    after(() => {
      closeTimeline();
    });

    before(() => {
      openTimelineUsingToggle();
      addNameAndDescriptionToTimeline(timeline);
      populateTimeline();
    });

    beforeEach(() => {
      goToQueryTab();
    });

    it('can be added filter', () => {
      addFilter(timeline.filter);
      cy.get(TIMELINE_FILTER(timeline.filter)).should('exist');
    });

    it('pins an event', () => {
      pinFirstEvent();
      cy.get(PIN_EVENT)
        .should('have.attr', 'aria-label')
        .and('match', /Unpin the event in row 2/);
    });

    it('has a lock icon', () => {
      cy.get(LOCKED_ICON).should('be.visible');
    });

    it('can be added notes', () => {
      addNotesToTimeline(timeline.notes);
      cy.get(NOTES_TEXT).should('have.text', timeline.notes);
    });

    it('can be marked as favorite', () => {
      markAsFavorite();
      waitForTimelineChanges();
      cy.get(FAVORITE_TIMELINE).should('have.text', 'Remove from favorites');
    });
  });
});
