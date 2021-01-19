/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { case1 } from '../objects/case';

import {
  ALL_CASES_CLOSE_ACTION,
  ALL_CASES_CLOSED_CASES_STATS,
  ALL_CASES_COMMENTS_COUNT,
  ALL_CASES_DELETE_ACTION,
  ALL_CASES_IN_PROGRESS_CASES_STATS,
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
  CASE_DETAILS_DESCRIPTION,
  CASE_DETAILS_PAGE_TITLE,
  // CASE_DETAILS_PUSH_TO_EXTERNAL_SERVICE_BTN,
  CASE_DETAILS_STATUS,
  CASE_DETAILS_TAGS,
  CASE_DETAILS_USER_ACTION_DESCRIPTION_USERNAME,
  CASE_DETAILS_USER_ACTION_DESCRIPTION_EVENT,
  CASE_DETAILS_USERNAMES,
  PARTICIPANTS,
  REPORTER,
} from '../screens/case_details';
import { TIMELINE_DESCRIPTION, TIMELINE_QUERY, TIMELINE_TITLE } from '../screens/timeline';

import { goToCaseDetails, goToCreateNewCase } from '../tasks/all_cases';
import { createTimeline } from '../tasks/api_calls/timelines';
import { openCaseTimeline } from '../tasks/case_details';
import { cleanKibana } from '../tasks/common';
import {
  attachTimeline,
  backToCases,
  createCase,
  fillCasesMandatoryfields,
} from '../tasks/create_new_case';
import { loginAndWaitForPageWithoutDateRange } from '../tasks/login';

import { CASES_URL } from '../urls/navigation';

describe('Cases', () => {
  beforeEach(() => {
    cleanKibana();
    createTimeline(case1.timeline).then((response) =>
      cy
        .wrap({
          ...case1,
          timeline: {
            ...case1.timeline,
            id: response.body.data.persistTimeline.timeline.savedObjectId,
          },
        })
        .as('mycase')
    );
  });

  it('Creates a new case with timeline and opens the timeline', function () {
    loginAndWaitForPageWithoutDateRange(CASES_URL);
    goToCreateNewCase();
    fillCasesMandatoryfields(this.mycase);
    attachTimeline(this.mycase);
    createCase();
    backToCases();

    cy.get(ALL_CASES_PAGE_TITLE).should('have.text', 'Cases');
    cy.get(ALL_CASES_OPEN_CASES_STATS).should('have.text', 'Open cases1');
    cy.get(ALL_CASES_CLOSED_CASES_STATS).should('have.text', 'Closed cases0');
    cy.get(ALL_CASES_IN_PROGRESS_CASES_STATS).should('have.text', 'In progress cases0');
    cy.get(ALL_CASES_OPEN_CASES_COUNT).should('have.text', 'Open (1)');
    cy.get(ALL_CASES_REPORTERS_COUNT).should('have.text', 'Reporter1');
    cy.get(ALL_CASES_TAGS_COUNT).should('have.text', 'Tags2');
    cy.get(ALL_CASES_NAME).should('have.text', this.mycase.name);
    cy.get(ALL_CASES_REPORTER).should('have.text', this.mycase.reporter);
    (this.mycase as typeof case1).tags.forEach((tag, index) => {
      cy.get(ALL_CASES_TAGS(index)).should('have.text', tag);
    });
    cy.get(ALL_CASES_COMMENTS_COUNT).should('have.text', '0');
    cy.get(ALL_CASES_OPENED_ON).should('include.text', 'ago');
    cy.get(ALL_CASES_SERVICE_NOW_INCIDENT).should('have.text', 'Not pushed');
    cy.get(ALL_CASES_DELETE_ACTION).should('exist');
    cy.get(ALL_CASES_CLOSE_ACTION).should('exist');

    goToCaseDetails();

    const expectedTags = this.mycase.tags.join('');
    cy.get(CASE_DETAILS_PAGE_TITLE).should('have.text', this.mycase.name);
    cy.get(CASE_DETAILS_STATUS).should('have.text', 'Open');
    cy.get(CASE_DETAILS_USER_ACTION_DESCRIPTION_USERNAME).should('have.text', this.mycase.reporter);
    cy.get(CASE_DETAILS_USER_ACTION_DESCRIPTION_EVENT).should('have.text', 'added description');
    cy.get(CASE_DETAILS_DESCRIPTION).should(
      'have.text',
      `${this.mycase.description} ${this.mycase.timeline.title}`
    );
    cy.get(CASE_DETAILS_USERNAMES).eq(REPORTER).should('have.text', this.mycase.reporter);
    cy.get(CASE_DETAILS_USERNAMES).eq(PARTICIPANTS).should('have.text', this.mycase.reporter);
    cy.get(CASE_DETAILS_TAGS).should('have.text', expectedTags);
    // cy.get(CASE_DETAILS_PUSH_TO_EXTERNAL_SERVICE_BTN).should('have.attr', 'disabled');

    openCaseTimeline();

    cy.get(TIMELINE_TITLE).contains(this.mycase.timeline.title);
    cy.get(TIMELINE_DESCRIPTION).contains(this.mycase.timeline.description);
    cy.get(TIMELINE_QUERY).should('have.text', this.mycase.timeline.query);
  });
});
