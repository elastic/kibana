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
let template = '';

describe('Export timelines', () => {
  before(async () => {
    cy.intercept('POST', '**api/timeline/_export?file_name=timelines_export.ndjson*').as('export');
    template = await createTimelineTemplate(timelineTemplate);
  });

  after(async () => {
    const templateId = JSON.parse(JSON.stringify(template)).savedObjectId;
    deleteTimelineTemplate(templateId);
  });

  it('Exports a custom timeline template', () => {
    loginAndWaitForPageWithoutDateRange(TIMELINE_TEMPLATES_URL);

    const jsonTemplate = JSON.parse(JSON.stringify(template));
    exportTimeline(jsonTemplate.savedObjectId);

    cy.wait('@export').then(({ response: exportResponse }) => {
      cy.wrap(JSON.parse(exportResponse!.body as string).templateTimelineId).should(
        'eql',
        expectedExportedTimelineTemplate(jsonTemplate)
      );
    });
  });
});
