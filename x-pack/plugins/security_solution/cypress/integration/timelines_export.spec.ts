/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { exportTimeline, waitForTimelinesPanelToBeLoaded } from '../tasks/timelines';
import { loginAndWaitForPageWithoutDateRange } from '../tasks/login';

import { TIMELINES_URL } from '../urls/navigation';
import { createTimeline } from '../tasks/api_calls/timelines';
import { expectedExportedTimeline, timeline } from '../objects/timeline';
import { cleanKibana } from '../tasks/common';

describe('Export timelines', () => {
  let timelineResponse: Cypress.Response;
  let timelineId: string;
  beforeEach(() => {
    cleanKibana();
    cy.intercept('POST', '/api/timeline/_export?file_name=timelines_export.ndjson').as('export');
    createTimeline(timeline).then((response) => {
      timelineResponse = response;
      timelineId = response.body.data.persistTimeline.timeline.savedObjectId;
    });
  });

  it('Exports a custom timeline', () => {
    loginAndWaitForPageWithoutDateRange(TIMELINES_URL);
    waitForTimelinesPanelToBeLoaded();
    exportTimeline(timelineId);

    cy.wait('@export').then(({ response }) => {
      cy.wrap(response!.statusCode).should('eql', 200);
      cy.wrap(response!.body).should('eql', expectedExportedTimeline(timelineResponse));
    });
  });
});
