/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { timeline } from '../../objects/timeline';

import { UNLOCKED_ICON, PIN_EVENT, TIMELINE_FILTER, TIMELINE_QUERY } from '../../screens/timeline';
import { addNoteToTimeline } from '../../tasks/api_calls/notes';
import { createTimeline } from '../../tasks/api_calls/timelines';

import { cleanKibana } from '../../tasks/common';

import { loginAndWaitForPageWithoutDateRange } from '../../tasks/login';
import {
  addFilter,
  closeTimeline,
  openTimelineById,
  pinFirstEvent,
  waitForEventsPanelToBeLoaded,
} from '../../tasks/timeline';
import { waitForTimelinesPanelToBeLoaded } from '../../tasks/timelines';

import { TIMELINES_URL } from '../../urls/navigation';

describe('Timeline query tab', () => {
  let timelineId: string | null = null;
  let noteId: string | null = null;
  before(() => {
    cleanKibana();
    loginAndWaitForPageWithoutDateRange(TIMELINES_URL);
    waitForTimelinesPanelToBeLoaded();

    createTimeline(timeline)
      .then((response) => {
        timelineId = response.body.data.persistTimeline.timeline.savedObjectId;
      })
      .then(() => {
        const note = timeline.notes;
        addNoteToTimeline(note, timelineId!).should((response) => {
          expect(response.status).to.equal(200);
          noteId = response.body.data.persistNote.note.noteId;
          waitForTimelinesPanelToBeLoaded();
          openTimelineById(timelineId!)
            .click({ force: true })
            .then(() => {
              waitForEventsPanelToBeLoaded();
              pinFirstEvent();
              addFilter(timeline.filter);
            });
        });
      });
  });

  describe('Query tab', () => {
    after(() => {
      closeTimeline();
    });
    it('should contain the right query', () => {
      cy.get(TIMELINE_QUERY).should('have.text', `${timeline.query}`);
    });

    it('should display timeline filter', () => {
      cy.get(TIMELINE_FILTER(timeline.filter)).should('exist');
    });

    it('should display pinned events', () => {
      cy.get(PIN_EVENT)
        .should('have.attr', 'aria-label')
        .and('match', /Unpin the event in row 2/);
    });

    it('should have an unlock icon', () => {
      cy.get(UNLOCKED_ICON).should('be.visible');
    });
  });
});
