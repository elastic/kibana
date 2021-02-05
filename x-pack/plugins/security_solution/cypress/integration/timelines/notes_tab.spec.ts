/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { timeline } from '../../objects/timeline';

import { NOTES_TEXT, NOTES_TEXT_AREA } from '../../screens/timeline';
import { addNoteToTimeline } from '../../tasks/api_calls/notes';
import { createTimeline } from '../../tasks/api_calls/timelines';

import { cleanKibana } from '../../tasks/common';

import { loginAndWaitForPageWithoutDateRange } from '../../tasks/login';
import {
  closeTimeline,
  getNotePreviewByNoteId,
  goToNotesTab,
  openTimelineById,
  waitForEventsPanelToBeLoaded,
} from '../../tasks/timeline';
import { waitForTimelinesPanelToBeLoaded } from '../../tasks/timelines';

import { TIMELINES_URL } from '../../urls/navigation';

describe('Timeline notes tab', () => {
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
            });
        });
      });
  });

  describe('render', () => {
    after(() => {
      closeTimeline();
    });

    before(() => {
      goToNotesTab();
      getNotePreviewByNoteId(noteId!).should('exist');
    });

    it('should contain notes', () => {
      cy.get(NOTES_TEXT).should('have.text', timeline.notes);
    });

    it('should render mockdown', () => {
      cy.get(NOTES_TEXT_AREA).should('exist');
    });
  });
});
