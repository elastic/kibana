/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { timelineNonValidQuery } from '../../objects/timeline';

import {
  NOTES_AUTHOR,
  NOTES_CODE_BLOCK,
  NOTES_LINK,
  NOTES_TEXT,
  NOTES_TEXT_AREA,
} from '../../screens/timeline';
import { createTimeline } from '../../tasks/api_calls/timelines';

import { cleanKibana } from '../../tasks/common';

import { loginAndWaitForPageWithoutDateRange } from '../../tasks/login';
import {
  addNotesToTimeline,
  closeTimeline,
  openTimelineById,
  refreshTimelinesUntilTimeLinePresent,
} from '../../tasks/timeline';
import { waitForTimelinesPanelToBeLoaded } from '../../tasks/timelines';

import { TIMELINES_URL } from '../../urls/navigation';

const text = 'Elastic';
const link = 'https://www.elastic.co/';

describe('Timeline notes tab', () => {
  before(() => {
    cleanKibana();
    loginAndWaitForPageWithoutDateRange(TIMELINES_URL);
    waitForTimelinesPanelToBeLoaded();

    createTimeline(timelineNonValidQuery)
      .then((response) => response.body.data.persistTimeline.timeline.savedObjectId)
      .then((timelineId: string) =>
        refreshTimelinesUntilTimeLinePresent(timelineId)
          // This cy.wait is here because we cannot do a pipe on a timeline as that will introduce multiple URL
          // request responses and indeterminism since on clicks to activates URL's.
          .then(() => cy.wait(1000))
          .then(() => openTimelineById(timelineId))
          .then(() => addNotesToTimeline(timelineNonValidQuery.notes, 1))
      );
  });

  after(() => {
    closeTimeline();
  });

  it('should render mockdown', () => {
    cy.get(NOTES_TEXT_AREA).should('exist');
  });

  it('should contain notes', () => {
    cy.get(NOTES_TEXT).first().should('have.text', timelineNonValidQuery.notes);
  });

  it('should be able to render font in bold', () => {
    addNotesToTimeline(`**bold**`, 2);
    cy.get(NOTES_TEXT).last().should('have.text', `bold`);
  });

  it('should be able to render font in italics', () => {
    addNotesToTimeline(`_italics_`, 3);
    cy.get(NOTES_TEXT).last().should('have.text', `italics`);
  });

  it('should be able to render code blocks', () => {
    addNotesToTimeline(`\`code\``, 4);
    cy.get(NOTES_CODE_BLOCK).should('exist');
  });

  it('should render the right author', () => {
    cy.get(NOTES_AUTHOR).should('have.text', text);
  });

  it('should be able to render a link', () => {
    addNotesToTimeline(`[${text}](${link})`, 5);

    cy.get(NOTES_LINK).last().should('have.text', `${text}(Opens in new tab or window)`);
  });

  it('should render notes content with hyper link', () => {
    cy.get(NOTES_LINK).last().click();
    cy.url.should('eq', link);
  });
});
