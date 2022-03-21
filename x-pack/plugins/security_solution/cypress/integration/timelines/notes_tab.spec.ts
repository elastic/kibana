/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getTimelineNonValidQuery } from '../../objects/timeline';

import {
  NOTES_AUTHOR,
  NOTES_CODE_BLOCK,
  NOTES_LINK,
  NOTES_TEXT,
  NOTES_TEXT_AREA,
} from '../../screens/timeline';
import { createTimeline } from '../../tasks/api_calls/timelines';

import { cleanKibana, deleteTimelines } from '../../tasks/common';

import { login, visitWithoutDateRange } from '../../tasks/login';
import {
  addNotesToTimeline,
  closeTimeline,
  goToNotesTab,
  openTimelineById,
  refreshTimelinesUntilTimeLinePresent,
} from '../../tasks/timeline';
import { waitForTimelinesPanelToBeLoaded } from '../../tasks/timelines';

import { TIMELINES_URL } from '../../urls/navigation';

const text = 'elastic';
const link = 'https://www.elastic.co/';

describe('Timeline notes tab', () => {
  before(() => {
    cleanKibana();
    login();
  });
  beforeEach(() => {
    deleteTimelines();
    visitWithoutDateRange(TIMELINES_URL);
    waitForTimelinesPanelToBeLoaded();

    createTimeline(getTimelineNonValidQuery())
      .then((response) => response.body.data.persistTimeline.timeline.savedObjectId)
      .then((timelineId: string) =>
        refreshTimelinesUntilTimeLinePresent(timelineId)
          // This cy.wait is here because we cannot do a pipe on a timeline as that will introduce multiple URL
          // request responses and indeterminism since on clicks to activates URL's.
          .then(() => cy.wait(1000))
          .then(() => openTimelineById(timelineId))
          .then(() => goToNotesTab())
      );
  });

  after(() => {
    closeTimeline();
  });
  it('should render mockdown', () => {
    cy.intercept('/api/note').as(`updateNote`);
    addNotesToTimeline(getTimelineNonValidQuery().notes);
    cy.wait('@updateNote').its('response.statusCode').should('eq', 200);
    cy.get(NOTES_TEXT_AREA).should('exist');
  });

  it('should contain notes', () => {
    cy.intercept('/api/note').as(`updateNote`);
    addNotesToTimeline(getTimelineNonValidQuery().notes);
    cy.wait('@updateNote').its('response.statusCode').should('eq', 200);
    cy.get(NOTES_TEXT).first().should('have.text', getTimelineNonValidQuery().notes);
  });

  it('should be able to render font in bold', () => {
    cy.intercept('/api/note').as(`updateNote`);
    addNotesToTimeline(`**bold**`);
    cy.wait('@updateNote').its('response.statusCode').should('eq', 200);
    cy.get(`${NOTES_TEXT} strong`).last().should('have.text', `bold`);
  });

  it('should be able to render font in italics', () => {
    cy.intercept('/api/note').as(`updateNote`);
    addNotesToTimeline(`_italics_`);
    cy.wait('@updateNote').its('response.statusCode').should('eq', 200);
    cy.get(`${NOTES_TEXT} em`).last().should('have.text', `italics`);
  });

  it('should be able to render code blocks', () => {
    cy.intercept('/api/note').as(`updateNote`);
    addNotesToTimeline(`\`code\``);
    cy.wait('@updateNote').its('response.statusCode').should('eq', 200);
    cy.get(NOTES_CODE_BLOCK).should('exist');
  });

  it('should render the right author', () => {
    cy.intercept('/api/note').as(`updateNote`);
    addNotesToTimeline(getTimelineNonValidQuery().notes);
    cy.wait('@updateNote').its('response.statusCode').should('eq', 200);
    cy.get(NOTES_AUTHOR).first().should('have.text', text);
  });

  it('should be able to render a link', () => {
    cy.intercept('/api/note').as(`updateNote`);
    cy.intercept(link).as(`link`);
    addNotesToTimeline(`[${text}](${link})`);
    cy.wait('@updateNote').its('response.statusCode').should('eq', 200);
    cy.get(NOTES_LINK).last().should('have.text', `${text}(opens in a new tab or window)`);
    cy.get(NOTES_LINK).last().click();
    cy.wait('@link').its('response.statusCode').should('eq', 200);
  });
});
