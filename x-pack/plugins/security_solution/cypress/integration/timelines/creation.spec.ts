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
  TIMELINE_FLYOUT_WRAPPER,
  TIMELINE_PANEL,
} from '../../screens/timeline';
import { createTimelineTemplate } from '../../tasks/api_calls/timelines';

import { cleanKibana } from '../../tasks/common';

import { loginAndWaitForPage, loginAndWaitForPageWithoutDateRange } from '../../tasks/login';
import { openTimelineUsingToggle } from '../../tasks/security_main';
import {
  addEqlToTimeline,
  addFilter,
  addNameAndDescriptionToTimeline,
  addNotesToTimeline,
  clickingOnCreateTimelineFormTemplateBtn,
  closeTimeline,
  createNewTimeline,
  expandEventAction,
  goToQueryTab,
  markAsFavorite,
  pinFirstEvent,
  populateTimeline,
  waitForTimelineChanges,
} from '../../tasks/timeline';

import { OVERVIEW_URL, TIMELINE_TEMPLATES_URL } from '../../urls/navigation';
import { waitForTimelinesPanelToBeLoaded } from '../../tasks/timelines';
import { OVERVIEW_REVENT_TIMELINES } from '../../screens/overview';

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
      cy.visit(OVERVIEW_URL);
      cy.get(OVERVIEW_REVENT_TIMELINES).should('contain', timeline.title);
      openTimelineUsingToggle();
    });

    it('should update timeline after adding eql', () => {
      cy.intercept('PATCH', '/api/timeline').as('updateTimeline');
      const eql = 'any where process.name == "which"';
      addEqlToTimeline(eql);
      cy.wait('@updateTimeline').then(({ response }) => {
        expect(response!.body.data.persistTimeline.timeline.eqlOptions).to.haveOwnProperty(
          'query',
          eql
        );
      });
    });
  });
});

describe('Create a timeline from a template', () => {
  before(() => {
    cleanKibana();
    loginAndWaitForPageWithoutDateRange(TIMELINE_TEMPLATES_URL);
    waitForTimelinesPanelToBeLoaded();
  });

  it('Should have the same query and open the timeline modal', () => {
    createTimelineTemplate(timeline).then(() => {
      expandEventAction();
      cy.intercept('/api/timeline').as('timeline');

      clickingOnCreateTimelineFormTemplateBtn();
      cy.wait('@timeline', { timeout: 100000 }).then(({ request }) => {
        if (request.body && request.body.timeline) {
          expect(request.body.timeline).to.haveOwnProperty('description', timeline.description);
          expect(request.body.timeline.kqlQuery.filterQuery.kuery).to.haveOwnProperty(
            'expression',
            timeline.query
          );
          cy.get(TIMELINE_FLYOUT_WRAPPER).should('have.css', 'visibility', 'visible');
        }
      });
    });
  });
});
