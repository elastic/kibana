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
  refreshTimelinesUntilTimeLinePresent,
} from '../../tasks/timeline';
import { waitForTimelinesPanelToBeLoaded } from '../../tasks/timelines';

import { TIMELINES_URL } from '../../urls/navigation';

describe('Timeline query tab', () => {
  before(() => {
    cleanKibana();
    loginAndWaitForPageWithoutDateRange(TIMELINES_URL);
    waitForTimelinesPanelToBeLoaded();

    createTimeline(timeline)
      .then((response) => response.body.data.persistTimeline.timeline.savedObjectId)
      .then((timelineId: string) => {
        refreshTimelinesUntilTimeLinePresent(timelineId)
          // This cy.wait is here because we cannot do a pipe on a timeline as that will introduce multiple URL
          // request responses and indeterminism since on clicks to activates URL's.
          .then(() => cy.wait(1000))
          .then(() =>
            addNoteToTimeline(timeline.notes, timelineId).should((response) =>
              expect(response.status).to.equal(200)
            )
          )
          .then(() => openTimelineById(timelineId))
          .then(() => pinFirstEvent())
          .then(() => addFilter(timeline.filter));
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
