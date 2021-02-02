/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { timeline } from '../../objects/timeline';

import {
  LOCKED_ICON,
  PIN_EVENT,
  TIMELINE_FILTER,
  TIMELINE_QUERY,
  QUERY_TAB_BUTTON,
} from '../../screens/timeline';

import { cleanKibana } from '../../tasks/common';

import { loginAndWaitForPage } from '../../tasks/login';
import { openTimelineUsingToggle } from '../../tasks/security_main';
import {
  addFilter,
  addNameAndDescriptionToTimeline,
  addNotesToTimeline,
  closeTimeline,
  markAsFavorite,
  pinFirstEvent,
  populateTimeline,
  waitForTimelineChanges,
} from '../../tasks/timeline';

import { OVERVIEW_URL } from '../../urls/navigation';

describe('Timeline query tab', () => {
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

  describe('Query tab', () => {
    before(() => {
      openTimelineUsingToggle();
      cy.get(QUERY_TAB_BUTTON).click({ force: true });
    });

    after(() => {
      closeTimeline();
    });
    it('should contain the query tab', () => {
      cy.get(TIMELINE_QUERY).should('have.text', `${timeline.query} `);
    });

    it('should display timeline filter', () => {
      cy.get(TIMELINE_FILTER(timeline.filter)).should('exist');
    });

    it('should display pinned events', () => {
      cy.get(PIN_EVENT)
        .should('have.attr', 'aria-label')
        .and('match', /Unpin the event in row 2/);
    });

    it('should have an unlock icon', () => {
      cy.get(LOCKED_ICON).should('be.visible');
    });
  });
});
