/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { timelineNonValidQuery } from '../../objects/timeline';

import { NOTES_TEXT, NOTES_TEXT_AREA } from '../../screens/timeline';
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
          .then(() => addNotesToTimeline(timelineNonValidQuery.notes))
      );
  });

  after(() => {
    closeTimeline();
  });

  it('should contain notes', () => {
    cy.get(NOTES_TEXT).should('have.text', timelineNonValidQuery.notes);
  });

  it('should render mockdown', () => {
    cy.get(NOTES_TEXT_AREA).should('exist');
  });
});
