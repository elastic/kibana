/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ALL_CASES_CLOSED_CASES_STATS,
  ALL_CASES_COMMENTS_COUNT,
  ALL_CASES_IN_PROGRESS_CASES_STATS,
  ALL_CASES_NAME,
  ALL_CASES_NOT_PUSHED,
  ALL_CASES_NUMBER_OF_ALERTS,
  ALL_CASES_OPEN_CASES_STATS,
  ALL_CASES_REPORTER,
  ALL_CASES_IN_PROGRESS_STATUS,
} from '../../../screens/all_cases';
import {
  CASES_TAGS,
  CASE_CONNECTOR,
  CASE_DETAILS_PAGE_TITLE,
  CASE_DETAILS_USERNAMES,
  CASE_EVENT_UPDATE,
  CASE_IN_PROGRESS_STATUS,
  CASE_SWITCH,
  CASE_USER_ACTION,
} from '../../../screens/case_details';
import { CASES_PAGE } from '../../../screens/kibana_navigation';

import { goToCaseDetails } from '../../../tasks/all_cases';
import { deleteCase } from '../../../tasks/case_details';
import {
  navigateFromKibanaCollapsibleTo,
  openKibanaNavigation,
} from '../../../tasks/kibana_navigation';
import { login, visitWithoutDateRange } from '../../../tasks/login';
import { importCase } from '../../../tasks/saved_objects';

import { KIBANA_SAVED_OBJECTS } from '../../../urls/navigation';

const CASE_NDJSON = '7_16_case.ndjson';
const importedCase = {
  title: '7.16 case to export',
  user: 'glo',
  reporter: 'glo@test.co',
  tags: 'export case',
  numberOfAlerts: '2',
  numberOfComments: '2',
  description:
    "This is the description of the 7.16 case that I'm going to import in future versions.",
  timeline: 'This is just a timeline',
  status: 'In progress',
  ruleName: 'This is a test',
  participants: ['test', 'elastic'],
  connector: 'Jira test',
};
const updateStatusRegex = new RegExp(
  `\\S${importedCase.user}marked case as${importedCase.status}\\S*\\s?(\\S*)?\\s?(\\S*)?`
);
const alertUpdateRegex = new RegExp(
  `\\S${importedCase.user}added an alert from Unknown\\S*\\s?(\\S*)?\\s?(\\S*)?`
);
const incidentManagementSystemRegex = new RegExp(
  `\\S${importedCase.participants[0]}selected ${importedCase.connector} as incident management system\\S*\\s?(\\S*)?\\s?(\\S*)?`
);
const DESCRIPTION = 0;
const TIMELINE = 1;
const LENS = 2;
const STATUS_UPDATE = 0;
const FIRST_ALERT_UPDATE = 1;
const SECOND_ALERT_UPDATE = 2;
const INCIDENT_MANAGEMENT_SYSTEM_UPDATE = 3;
const EXPECTED_NUMBER_OF_UPDATES = 4;
const EXPECTED_NUMBER_OF_PARTICIPANTS = 4;
const REPORTER = 0;
const FIRST_PARTICIPANT = 1;
const SECOND_PARTICIPANT = 2;
const THIRD_PARTICIPANT = 3;

describe('Import case after upgrade', () => {
  before(() => {
    login();
    visitWithoutDateRange(KIBANA_SAVED_OBJECTS);
    importCase(CASE_NDJSON);
    openKibanaNavigation();
    navigateFromKibanaCollapsibleTo(CASES_PAGE);
  });

  after(() => {
    deleteCase();
  });

  it('Displays the correct number of opened cases on the cases page', () => {
    const EXPECTED_NUMBER_OF_OPENED_CASES = '0';
    cy.get(ALL_CASES_OPEN_CASES_STATS).should('have.text', EXPECTED_NUMBER_OF_OPENED_CASES);
  });

  it('Displays the correct number of in progress cases on the cases page', () => {
    const EXPECTED_NUMBER_OF_IN_PROGRESS_CASES = '1';
    cy.get(ALL_CASES_IN_PROGRESS_CASES_STATS).should(
      'have.text',
      EXPECTED_NUMBER_OF_IN_PROGRESS_CASES
    );
  });

  it('Displays the correct number of closed cases on the cases page', () => {
    const EXPECTED_NUMBER_OF_CLOSED_CASES = '0';
    cy.get(ALL_CASES_CLOSED_CASES_STATS).should('have.text', EXPECTED_NUMBER_OF_CLOSED_CASES);
  });

  it('Displays the correct case details on the cases page', () => {
    cy.get(ALL_CASES_NAME).should('have.text', importedCase.title);
    cy.get(ALL_CASES_REPORTER).should('have.text', importedCase.user);
    cy.get(ALL_CASES_NUMBER_OF_ALERTS).should('have.text', importedCase.numberOfAlerts);
    cy.get(ALL_CASES_COMMENTS_COUNT).should('have.text', importedCase.numberOfComments);
    cy.get(ALL_CASES_NOT_PUSHED).should('be.visible');
    cy.get(ALL_CASES_IN_PROGRESS_STATUS).should('be.visible');
  });

  it('Displays the correct case details on the case details page', () => {
    goToCaseDetails();

    cy.get(CASE_DETAILS_PAGE_TITLE).should('have.text', importedCase.title);
    cy.get(CASE_IN_PROGRESS_STATUS).should('exist');
    cy.get(CASE_SWITCH).should('have.attr', 'aria-checked', 'false');
    cy.get(CASE_USER_ACTION).eq(DESCRIPTION).should('have.text', importedCase.description);
    cy.get(CASE_USER_ACTION).eq(TIMELINE).should('have.text', importedCase.timeline);
    cy.get(CASE_USER_ACTION).eq(LENS).should('have.text', '');
    cy.get(CASE_EVENT_UPDATE).should('have.length', EXPECTED_NUMBER_OF_UPDATES);
    cy.get(CASE_EVENT_UPDATE).eq(STATUS_UPDATE).invoke('text').should('match', updateStatusRegex);
    cy.get(CASE_EVENT_UPDATE)
      .eq(FIRST_ALERT_UPDATE)
      .invoke('text')
      .should('match', alertUpdateRegex);
    cy.get(CASE_EVENT_UPDATE)
      .eq(SECOND_ALERT_UPDATE)
      .invoke('text')
      .should('match', alertUpdateRegex);
    cy.get(CASE_EVENT_UPDATE)
      .eq(INCIDENT_MANAGEMENT_SYSTEM_UPDATE)
      .invoke('text')
      .should('match', incidentManagementSystemRegex);
    cy.get(CASE_DETAILS_USERNAMES).should('have.length', EXPECTED_NUMBER_OF_PARTICIPANTS);
    cy.get(CASE_DETAILS_USERNAMES).eq(REPORTER).should('have.text', importedCase.user);
    cy.get(CASE_DETAILS_USERNAMES).eq(FIRST_PARTICIPANT).should('have.text', importedCase.user);
    cy.get(CASE_DETAILS_USERNAMES)
      .eq(SECOND_PARTICIPANT)
      .should('have.text', importedCase.participants[0]);
    cy.get(CASE_DETAILS_USERNAMES)
      .eq(THIRD_PARTICIPANT)
      .should('have.text', importedCase.participants[1]);
    cy.get(CASES_TAGS(importedCase.tags)).should('exist');
    cy.get(CASE_CONNECTOR).should('have.text', importedCase.connector);
  });
});
