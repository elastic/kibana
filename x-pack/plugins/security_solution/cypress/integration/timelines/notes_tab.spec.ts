/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { timeline } from '../../objects/timeline';

import { NOTES_TAB_BUTTON, NOTES_TEXT, NOTES_TEXT_AREA } from '../../screens/timeline';

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

describe('Timeline notes tab', () => {
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

  describe('Notes tab', () => {
    before(() => {
      openTimelineUsingToggle();
      cy.get(NOTES_TAB_BUTTON).click({ force: true });
    });

    after(() => {
      closeTimeline();
    });

    it('should contain notes', () => {
      cy.get(NOTES_TEXT).should('have.text', timeline.notes);
    });

    it('should render mockdown', () => {
      cy.get(NOTES_TEXT_AREA).should('exist');
    });
  });
});
