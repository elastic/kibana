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

import { cleanKibana } from '../../tasks/common';

import { login, visitWithoutDateRange } from '../../tasks/login';
import {
  addNotesToTimeline,
  goToNotesTab,
  openTimelineById,
  refreshTimelinesUntilTimeLinePresent,
} from '../../tasks/timeline';

import { TIMELINES_URL } from '../../urls/navigation';

const text = 'elastic';
const link = 'https://www.elastic.co/';

describe('Timeline notes tab', () => {
  before(() => {
    cleanKibana();
    login();
    visitWithoutDateRange(TIMELINES_URL);

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

  it('should render mockdown', () => {
    addNotesToTimeline(getTimelineNonValidQuery().notes);
    cy.get(NOTES_TEXT_AREA).should('exist');
  });

  it('should contain notes', () => {
    addNotesToTimeline(getTimelineNonValidQuery().notes);
    cy.get(NOTES_TEXT).first().should('have.text', getTimelineNonValidQuery().notes);
  });

  it('should be able to render font in bold', () => {
    addNotesToTimeline(`**bold**`);
    cy.get(`${NOTES_TEXT} strong`).last().should('have.text', `bold`);
  });

  it('should be able to render font in italics', () => {
    addNotesToTimeline(`_italics_`);
    cy.get(`${NOTES_TEXT} em`).last().should('have.text', `italics`);
  });

  it('should be able to render code blocks', () => {
    addNotesToTimeline(`\`code\``);
    cy.get(NOTES_CODE_BLOCK).should('exist');
  });

  it('should render the right author', () => {
    addNotesToTimeline(getTimelineNonValidQuery().notes);
    cy.get(NOTES_AUTHOR).first().should('have.text', text);
  });

  it('should be able to render a link', () => {
    addNotesToTimeline(`[${text}](${link})`);
    cy.get(NOTES_LINK).last().should('have.text', `${text}(opens in a new tab or window)`);
    cy.get(NOTES_LINK).last().click();
  });
});
