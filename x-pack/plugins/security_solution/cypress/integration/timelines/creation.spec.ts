/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getTimeline } from '../../objects/timeline';

import {
  LOCKED_ICON,
  NOTES_TEXT,
  PIN_EVENT,
  SERVER_SIDE_EVENT_COUNT,
  TIMELINE_FILTER,
  TIMELINE_FLYOUT_WRAPPER,
  TIMELINE_PANEL,
  TIMELINE_TAB_CONTENT_EQL,
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
  pinFirstEvent,
  populateTimeline,
} from '../../tasks/timeline';

import { OVERVIEW_URL, TIMELINE_TEMPLATES_URL } from '../../urls/navigation';
import { waitForTimelinesPanelToBeLoaded } from '../../tasks/timelines';

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
      addNameAndDescriptionToTimeline(getTimeline());
      populateTimeline();
    });

    beforeEach(() => {
      goToQueryTab();
    });

    it('can be added filter', () => {
      addFilter(getTimeline().filter);
      cy.get(TIMELINE_FILTER(getTimeline().filter)).should('exist');
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
      addNotesToTimeline(getTimeline().notes);
      cy.get(NOTES_TEXT).should('have.text', getTimeline().notes);
    });

    it('should update timeline after adding eql', () => {
      cy.intercept('PATCH', '/api/timeline').as('updateTimeline');
      const eql = 'any where process.name == "which"';
      addEqlToTimeline(eql);

      cy.wait('@updateTimeline', { timeout: 10000 }).its('response.statusCode').should('eq', 200);

      cy.get(`${TIMELINE_TAB_CONTENT_EQL} ${SERVER_SIDE_EVENT_COUNT}`)
        .invoke('text')
        .then(parseInt)
        .should('be.gt', 0);
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
    createTimelineTemplate(getTimeline()).then(() => {
      expandEventAction();
      cy.intercept('/api/timeline').as('timeline');

      clickingOnCreateTimelineFormTemplateBtn();
      cy.wait('@timeline', { timeout: 100000 }).then(({ request }) => {
        if (request.body && request.body.timeline) {
          expect(request.body.timeline).to.haveOwnProperty(
            'description',
            getTimeline().description
          );
          expect(request.body.timeline.kqlQuery.filterQuery.kuery).to.haveOwnProperty(
            'expression',
            getTimeline().query
          );
          cy.get(TIMELINE_FLYOUT_WRAPPER).should('have.css', 'visibility', 'visible');
        }
      });
    });
  });
});
