/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import semver from 'semver';
import {
  CORRELATION_EVENT_TABLE_CELL,
  DATA_PROVIDERS,
  DATE_PICKER_END,
  DATE_PICKER_START,
  DESTINATION_IP_KPI,
  GRAPH_TAB_BUTTON,
  HOST_KPI,
  QUERY_TAB_BUTTON,
  NOTE_DESCRIPTION,
  NOTE_PREVIEW,
  NOTES_TAB_BUTTON,
  PINNED_TAB_BUTTON,
  PROCESS_KPI,
  QUERY_EVENT_TABLE_CELL,
  SOURCE_IP_KPI,
  TIMELINE_CORRELATION_TAB,
  TIMELINE_CORRELATION_INPUT,
  TIMELINE_DESCRIPTION,
  TIMELINE_QUERY,
  TIMELINE_TITLE,
  USER_KPI,
} from '../screens/timeline';
import {
  NOTE,
  TIMELINES_USERNAME,
  TIMELINE_NAME,
  TIMELINES_DESCRIPTION,
  TIMELINES_NOTES_COUNT,
  TIMELINES_PINNED_EVENT_COUNT,
} from '../screens/timelines';

import { loginAndWaitForPageWithoutDateRange } from '../tasks/login';
import {
  closeTimeline,
  deleteTimeline,
  goToCorrelationTab,
  goToNotesTab,
  setKibanaTimezoneToUTC,
} from '../tasks/timeline';
import { expandNotes, importTimeline, openTimeline } from '../tasks/timelines';

import { TIMELINES_URL } from '../urls/navigation';

const timeline = '7_15_timeline.ndjson';
const username = 'elastic';

const timelineDetails = {
  dateStart: 'Oct 10, 2020 @ 22:00:00.000',
  dateEnd: 'Oct 11, 2030 @ 15:13:15.851',
  queryTab: 'Query4',
  queryTabAlt: 'Query2',
  correlationTab: 'Correlation',
  analyzerTab: 'Analyzer',
  notesTab: 'Notes2',
  pinnedTab: 'Pinned1',
};

const detectionAlert = {
  message: '—',
  eventCategory: 'file',
  eventAction: 'initial_scan',
  hostName: 'security-solution.local',
  sourceIp: '127.0.0.1',
  destinationIp: '127.0.0.2',
  userName: 'Security Solution',
};

const event = {
  timestamp: 'Nov 4, 2021 @ 10:09:29.438',
  message: '—',
  eventCategory: 'file',
  eventAction: 'initial_scan',
  hostName: 'security-solution.local',
  sourceIp: '127.0.0.1',
  destinationIp: '127.0.0.2',
  userName: 'Security Solution',
};

describe('Import timeline after upgrade', () => {
  before(() => {
    loginAndWaitForPageWithoutDateRange(TIMELINES_URL);
    importTimeline(timeline);
    setKibanaTimezoneToUTC();
  });

  after(() => {
    closeTimeline();
    deleteTimeline();
  });

  it('Displays the correct timeline details on the timelines page', () => {
    cy.readFile(`cypress/fixtures/${timeline}`).then((file) => {
      const timelineJson = JSON.parse(file);
      const regex = new RegExp(
        `\\S${timelineJson.globalNotes[0].createdBy}added a note\\S*\\s?(\\S*)?\\s?(\\S*)?${timelineJson.globalNotes[0].createdBy} added a note${timelineJson.globalNotes[0].note}`
      );

      cy.get(TIMELINE_NAME).should('have.text', timelineJson.title);
      cy.get(TIMELINES_DESCRIPTION).should('have.text', timelineJson.description);
      cy.get(TIMELINES_USERNAME).should('have.text', username);
      cy.get(TIMELINES_NOTES_COUNT).should('have.text', timelineJson.globalNotes.length.toString());
      cy.get(TIMELINES_PINNED_EVENT_COUNT).should(
        'have.text',
        timelineJson.pinnedEventIds.length.toString()
      );

      expandNotes();

      cy.get(NOTE).invoke('text').should('match', regex);
    });
  });

  it('Displays the correct timeline details inside the query tab', () => {
    let expectedQueryTab = timelineDetails.queryTab;
    if (semver.lt(Cypress.env('ORIGINAL_VERSION'), '7.10.0')) {
      expectedQueryTab = timelineDetails.queryTabAlt;
    }

    openTimeline();

    cy.readFile(`cypress/fixtures/${timeline}`).then((file) => {
      const timelineJson = JSON.parse(file);

      cy.get(TIMELINE_TITLE).should('have.text', timelineJson.title);
      cy.get(TIMELINE_DESCRIPTION).should('have.text', timelineJson.description);
      cy.get(DATA_PROVIDERS).should('have.length', timelineJson.dataProviders.length.toString());
      cy.get(DATA_PROVIDERS)
        .invoke('text')
        .then((value) => {
          expect(value.replace(/"/g, '')).to.eq(timelineJson.dataProviders[0].name);
        });
      cy.get(PROCESS_KPI).should('contain', '0');
      cy.get(USER_KPI).should('contain', '0');
      cy.get(HOST_KPI).should('contain', '1');
      cy.get(SOURCE_IP_KPI).should('contain', '1');
      cy.get(DESTINATION_IP_KPI).should('contain', '1');
      cy.get(DATE_PICKER_START).should('contain', timelineDetails.dateStart);
      cy.get(DATE_PICKER_END).should('contain', timelineDetails.dateEnd);
      cy.get(TIMELINE_QUERY).should(
        'have.text',
        timelineJson.kqlQuery.filterQuery.kuery.expression
      );
      cy.get(QUERY_TAB_BUTTON).should('have.text', expectedQueryTab);
      cy.get(TIMELINE_CORRELATION_TAB).should('have.text', timelineDetails.correlationTab);
      cy.get(GRAPH_TAB_BUTTON).should('have.text', timelineDetails.analyzerTab).and('be.disabled');
      cy.get(NOTES_TAB_BUTTON).should('have.text', timelineDetails.notesTab);
      cy.get(PINNED_TAB_BUTTON).should('have.text', timelineDetails.pinnedTab);

      cy.get(QUERY_EVENT_TABLE_CELL).eq(1).should('contain', detectionAlert.message);
      cy.get(QUERY_EVENT_TABLE_CELL).eq(2).should('contain', detectionAlert.eventCategory);
      cy.get(QUERY_EVENT_TABLE_CELL).eq(3).should('contain', detectionAlert.eventAction);
      cy.get(QUERY_EVENT_TABLE_CELL).eq(4).should('contain', detectionAlert.hostName);
      cy.get(QUERY_EVENT_TABLE_CELL).eq(5).should('contain', detectionAlert.sourceIp);
      cy.get(QUERY_EVENT_TABLE_CELL).eq(6).should('contain', detectionAlert.destinationIp);
      cy.get(QUERY_EVENT_TABLE_CELL).eq(7).should('contain', detectionAlert.userName);

      cy.get(QUERY_EVENT_TABLE_CELL).eq(8).should('contain', event.timestamp);
      cy.get(QUERY_EVENT_TABLE_CELL).eq(9).should('contain', event.message);
      cy.get(QUERY_EVENT_TABLE_CELL).eq(10).should('contain', event.eventCategory);
      cy.get(QUERY_EVENT_TABLE_CELL).eq(11).should('contain', event.eventAction);
      cy.get(QUERY_EVENT_TABLE_CELL).eq(12).should('contain', event.hostName);
      cy.get(QUERY_EVENT_TABLE_CELL).eq(13).should('contain', event.sourceIp);
      cy.get(QUERY_EVENT_TABLE_CELL).eq(14).should('contain', event.destinationIp);
      cy.get(QUERY_EVENT_TABLE_CELL).eq(15).should('contain', event.userName);
    });
  });

  it('Displays the correct timeline details inside the correlation tab', () => {
    goToCorrelationTab();

    cy.get(TIMELINE_CORRELATION_INPUT).should('be.empty');
    cy.get(CORRELATION_EVENT_TABLE_CELL).should('not.exist');
  });

  it('Displays the correct timeline details inside the notes tab', () => {
    goToNotesTab();

    cy.readFile(`cypress/fixtures/${timeline}`).then((file) => {
      const timelineJson = JSON.parse(file);
      const descriptionRegex = new RegExp(
        `\\S${username}added description\\S*\\s?(\\S*)?\\s?(\\S*)?${timelineJson.description}`
      );
      const noteRegex = new RegExp(
        `\\S${timelineJson.globalNotes[0].createdBy}added a note\\S*\\s?(\\S*)?\\s?(\\S*)?${timelineJson.globalNotes[0].createdBy} added a note${timelineJson.globalNotes[0].note}`
      );

      cy.get(NOTE_DESCRIPTION).invoke('text').should('match', descriptionRegex);
      cy.get(NOTE_PREVIEW).last().invoke('text').should('match', noteRegex);
    });
  });
});
