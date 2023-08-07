/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { tag } from '../../../tags';

import { getTimelineNonValidQuery } from '../../../objects/timeline';

import {
  DELETE_NOTE,
  NOTES_AUTHOR,
  NOTES_CODE_BLOCK,
  NOTE_DESCRIPTION,
  NOTES_LINK,
  NOTES_TEXT,
  NOTES_TEXT_AREA,
  MARKDOWN_INVESTIGATE_BUTTON,
} from '../../../screens/timeline';
import { MODAL_CONFIRMATION_BTN } from '../../../screens/alerts_detection_rules';
import { createTimeline } from '../../../tasks/api_calls/timelines';

import { cleanKibana } from '../../../tasks/common';

import { login, visitWithoutDateRange } from '../../../tasks/login';
import {
  addNotesToTimeline,
  goToNotesTab,
  openTimelineById,
  refreshTimelinesUntilTimeLinePresent,
} from '../../../tasks/timeline';

import { TIMELINES_URL } from '../../../urls/navigation';

const text = 'system_indices_superuser';
const link = 'https://www.elastic.co/';

describe.skip('Timeline notes tab', { tags: [tag.ESS, tag.SERVERLESS] }, () => {
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
          .then(() => cy.wrap(timelineId).as('timelineId'))
      );
  });

  beforeEach(function () {
    login();
    visitWithoutDateRange(TIMELINES_URL);
    openTimelineById(this?.timelineId as string);
    goToNotesTab();
    // eslint-disable-next-line cypress/no-unnecessary-waiting
    cy.wait(1000);
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

  it('should render insight query from markdown', () => {
    addNotesToTimeline(
      `!{investigate{"description":"2 top level OR providers, 1 nested AND","label":"test insight", "providers": [[{ "field": "event.id", "value": "kibana.alert.original_event.id", "queryType": "phrase", "excluded": "false" }], [{ "field": "event.category", "value": "network", "queryType": "phrase", "excluded": "false" }, {"field": "process.pid", "value": "process.pid", "queryType": "phrase", "excluded": "false"}]]}}`
    );
    cy.get(MARKDOWN_INVESTIGATE_BUTTON).should('exist');
  });

  it('should be able to delete a note', () => {
    const deleteNoteContent = 'delete me';
    addNotesToTimeline(deleteNoteContent);
    cy.get(DELETE_NOTE).last().click();
    cy.get(MODAL_CONFIRMATION_BTN).click();
    cy.get(NOTE_DESCRIPTION).last().should('not.have.text', deleteNoteContent);
  });
});
