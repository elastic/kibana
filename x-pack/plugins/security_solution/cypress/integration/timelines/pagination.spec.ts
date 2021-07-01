/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  TIMELINE_EVENT,
  TIMELINE_EVENTS_COUNT_NEXT_PAGE,
  TIMELINE_EVENTS_COUNT_PER_PAGE,
  TIMELINE_EVENTS_COUNT_PER_PAGE_BTN,
  TIMELINE_EVENTS_COUNT_PER_PAGE_OPTION,
  TIMELINE_EVENTS_COUNT_PREV_PAGE,
  TIMELINE_FLYOUT,
} from '../../screens/timeline';
import { cleanKibana } from '../../tasks/common';

import { loginAndWaitForPage } from '../../tasks/login';
import { openTimelineUsingToggle } from '../../tasks/security_main';
import { populateTimeline } from '../../tasks/timeline';

import { HOSTS_URL } from '../../urls/navigation';

const defaultPageSize = 25;
describe('Pagination', () => {
  beforeEach(() => {
    cleanKibana();
    loginAndWaitForPage(HOSTS_URL);
    openTimelineUsingToggle();
    populateTimeline();
  });

  it(`should have ${defaultPageSize} events in the page by default`, () => {
    cy.get(TIMELINE_EVENT).should('have.length', defaultPageSize);
  });

  it(`should select ${defaultPageSize} items per page by default`, () => {
    cy.get(TIMELINE_EVENTS_COUNT_PER_PAGE).should('contain.text', defaultPageSize);
  });

  it('should be able to change items count per page with the dropdown', () => {
    const itemsPerPage = 100;
    cy.intercept('POST', '/internal/bsearch').as('refetch');

    cy.get(TIMELINE_EVENTS_COUNT_PER_PAGE_BTN).first().click();
    cy.get(TIMELINE_EVENTS_COUNT_PER_PAGE_OPTION(itemsPerPage)).click();
    cy.wait('@refetch').its('response.statusCode').should('eq', 200);
    cy.get(TIMELINE_EVENTS_COUNT_PER_PAGE).should('contain.text', itemsPerPage);
  });

  it('should be able to go to next / previous page', () => {
    cy.intercept('POST', '/internal/bsearch').as('refetch');
    cy.get(`${TIMELINE_FLYOUT} ${TIMELINE_EVENTS_COUNT_NEXT_PAGE}`).first().click();
    cy.wait('@refetch').its('response.statusCode').should('eq', 200);

    cy.get(`${TIMELINE_FLYOUT} ${TIMELINE_EVENTS_COUNT_PREV_PAGE}`).first().click();
    cy.wait('@refetch').its('response.statusCode').should('eq', 200);
  });
});
