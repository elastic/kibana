/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { exportTimeline } from '../tasks/timelines';
import { loginAndWaitForPageWithoutDateRange } from '../tasks/login';
import {
  expectedExportedTimelineTemplate,
  timeline as timelineTemplate,
} from '../objects/timeline';

import { TIMELINE_TEMPLATES_URL } from '../urls/navigation';
import {
  createTimelineTemplate,
  deleteTimeline as deleteTimelineTemplate,
} from '../tasks/api_calls/timelines';

describe('Export timelines', () => {
  let templateResponse: Cypress.Response;
  let templateId: string;

  before(() => {
    cy.intercept('POST', 'api/timeline/_export?file_name=timelines_export.ndjson').as('export');
    createTimelineTemplate(timelineTemplate).then((response) => {
      templateResponse = response;
      templateId = response.body.data.persistTimeline.timeline.savedObjectId;
    });
  });

  after(() => {
    deleteTimelineTemplate(templateId);
  });

  it('Exports a custom timeline template', () => {
    loginAndWaitForPageWithoutDateRange(TIMELINE_TEMPLATES_URL);
    exportTimeline(templateId!);

    cy.wait('@export').then(({ response }) => {
      cy.wrap(response!.body).should('eql', expectedExportedTimelineTemplate(templateResponse));
    });
  });
});
