/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { case1 } from '../objects/case';

import {
  ALL_CASES_CLOSE_ACTION,
  ALL_CASES_CLOSED_CASES_COUNT,
  ALL_CASES_CLOSED_CASES_STATS,
  ALL_CASES_COMMENTS_COUNT,
  ALL_CASES_DELETE_ACTION,
  ALL_CASES_NAME,
  ALL_CASES_OPEN_CASES_COUNT,
  ALL_CASES_OPEN_CASES_STATS,
  ALL_CASES_OPENED_ON,
  ALL_CASES_PAGE_TITLE,
  ALL_CASES_REPORTER,
  ALL_CASES_REPORTERS_COUNT,
  ALL_CASES_SERVICE_NOW_INCIDENT,
  ALL_CASES_TAGS,
  ALL_CASES_TAGS_COUNT,
} from '../screens/all_cases';
import {
  ACTION,
  CASE_DETAILS_DESCRIPTION,
  CASE_DETAILS_PAGE_TITLE,
  CASE_DETAILS_PUSH_TO_EXTERNAL_SERVICE_BTN,
  CASE_DETAILS_STATUS,
  CASE_DETAILS_TAGS,
  CASE_DETAILS_USER_ACTION,
  CASE_DETAILS_USERNAMES,
  PARTICIPANTS,
  REPORTER,
  USER,
} from '../screens/case_details';
import { TIMELINE_DESCRIPTION, TIMELINE_QUERY, TIMELINE_TITLE } from '../screens/timeline';

import { goToCaseDetails, goToCreateNewCase } from '../tasks/all_cases';
import { openCaseTimeline } from '../tasks/case_details';
import { backToCases, createNewCase } from '../tasks/create_new_case';
import { loginAndWaitForPageWithoutDateRange } from '../tasks/login';
import { esArchiverLoad, esArchiverUnload } from '../tasks/es_archiver';

import { CASES_URL } from '../urls/navigation';

describe('Cases', () => {
  before(() => {
    esArchiverLoad('timeline');
  });

  after(() => {
    esArchiverUnload('timeline');
  });

  it('Creates a new case with timeline and opens the timeline', () => {
    loginAndWaitForPageWithoutDateRange(CASES_URL);
    goToCreateNewCase();
    createNewCase(case1);
    backToCases();

    cy.get(ALL_CASES_PAGE_TITLE).should('have.text', 'Cases Beta');
    cy.get(ALL_CASES_OPEN_CASES_STATS).should('have.text', 'Open cases1');
    cy.get(ALL_CASES_CLOSED_CASES_STATS).should('have.text', 'Closed cases0');
    cy.get(ALL_CASES_OPEN_CASES_COUNT).should('have.text', 'Open cases (1)');
    cy.get(ALL_CASES_CLOSED_CASES_COUNT).should('have.text', 'Closed cases (0)');
    cy.get(ALL_CASES_REPORTERS_COUNT).should('have.text', 'Reporter1');
    cy.get(ALL_CASES_TAGS_COUNT).should('have.text', 'Tags2');
    cy.get(ALL_CASES_NAME).should('have.text', case1.name);
    cy.get(ALL_CASES_REPORTER).should('have.text', case1.reporter);
    case1.tags.forEach((tag, index) => {
      cy.get(ALL_CASES_TAGS(index)).should('have.text', tag);
    });
    cy.get(ALL_CASES_COMMENTS_COUNT).should('have.text', '0');
    cy.get(ALL_CASES_OPENED_ON).should('include.text', 'ago');
    cy.get(ALL_CASES_SERVICE_NOW_INCIDENT).should('have.text', 'Not pushed');
    cy.get(ALL_CASES_DELETE_ACTION).should('exist');
    cy.get(ALL_CASES_CLOSE_ACTION).should('exist');

    goToCaseDetails();

    const expectedTags = case1.tags.join('');
    cy.get(CASE_DETAILS_PAGE_TITLE).should('have.text', case1.name);
    cy.get(CASE_DETAILS_STATUS).should('have.text', 'open');
    cy.get(CASE_DETAILS_USER_ACTION).eq(USER).should('have.text', case1.reporter);
    cy.get(CASE_DETAILS_USER_ACTION).eq(ACTION).should('have.text', 'added description');
    cy.get(CASE_DETAILS_DESCRIPTION).should(
      'have.text',
      `${case1.description} ${case1.timeline.title}`
    );
    cy.get(CASE_DETAILS_USERNAMES).eq(REPORTER).should('have.text', case1.reporter);
    cy.get(CASE_DETAILS_USERNAMES).eq(PARTICIPANTS).should('have.text', case1.reporter);
    cy.get(CASE_DETAILS_TAGS).should('have.text', expectedTags);
    cy.get(CASE_DETAILS_PUSH_TO_EXTERNAL_SERVICE_BTN).should('have.attr', 'disabled');

    openCaseTimeline();

    cy.get(TIMELINE_TITLE).should('have.attr', 'value', case1.timeline.title);
    cy.get(TIMELINE_DESCRIPTION).should('have.attr', 'value', case1.timeline.description);
    cy.get(TIMELINE_QUERY).invoke('text').should('eq', case1.timeline.query);
  });
});
