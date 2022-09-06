/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ADD_FILTER,
  SERVER_SIDE_EVENT_COUNT,
  TIMELINE_KQLMODE_FILTER,
  TIMELINE_KQLMODE_SEARCH,
  TIMELINE_SEARCH_OR_FILTER,
} from '../../screens/timeline';
import { cleanKibana } from '../../tasks/common';

import { login, visit, visitWithoutDateRange } from '../../tasks/login';
import { openTimelineUsingToggle } from '../../tasks/security_main';
import { executeTimelineKQL } from '../../tasks/timeline';
import { waitForTimelinesPanelToBeLoaded } from '../../tasks/timelines';

import { HOSTS_URL, TIMELINES_URL } from '../../urls/navigation';

describe('Timeline search and filters', () => {
  before(() => {
    cleanKibana();
    login();
  });
  describe('timeline search or filter KQL bar', () => {
    beforeEach(() => {
      visit(HOSTS_URL);
    });

    it('executes a KQL query', () => {
      const hostExistsQuery = 'host.name: *';
      openTimelineUsingToggle();
      executeTimelineKQL(hostExistsQuery);

      cy.get(SERVER_SIDE_EVENT_COUNT).should(($count) => expect(+$count.text()).to.be.gt(0));
    });
  });

  describe('Update kqlMode for timeline', () => {
    before(() => {
      visitWithoutDateRange(TIMELINES_URL);
      waitForTimelinesPanelToBeLoaded();
      openTimelineUsingToggle();
    });

    beforeEach(() => {
      cy.intercept('PATCH', '/api/timeline').as('update');
      cy.get(TIMELINE_SEARCH_OR_FILTER)
        .pipe(($el) => $el.trigger('click'))
        .should('exist');
    });

    it('should be able to update timeline kqlMode with filter', () => {
      cy.get(TIMELINE_KQLMODE_FILTER).click();
      cy.wait('@update').then(({ response }) => {
        cy.wrap(response?.statusCode).should('eql', 200);
        cy.wrap(response?.body.data.persistTimeline.timeline.kqlMode).should('eql', 'filter');
        cy.get(ADD_FILTER).should('exist');
      });
    });

    it('should be able to update timeline kqlMode with search', () => {
      cy.get(TIMELINE_KQLMODE_SEARCH).click();
      cy.wait('@update').then(({ response }) => {
        cy.wrap(response?.statusCode).should('eql', 200);
        cy.wrap(response?.body.data.persistTimeline.timeline.kqlMode).should('eql', 'search');
        cy.get(ADD_FILTER).should('not.exist');
      });
    });
  });
});
