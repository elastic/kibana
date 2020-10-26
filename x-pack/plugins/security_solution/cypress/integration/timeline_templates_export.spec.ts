/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { exportTimeline } from '../tasks/timelines';
import { esArchiverLoad } from '../tasks/es_archiver';
import { loginAndWaitForPageWithoutDateRange } from '../tasks/login';
import { timeline as timelineTemplate } from '../objects/timeline';

import { TIMELINE_TEMPLATES_URL } from '../urls/navigation';
import { openTimelineUsingToggle } from '../tasks/security_main';
import { addNameToTimeline, closeTimeline, createNewTimelineTemplate } from '../tasks/timeline';

describe('Export timelines', () => {
  before(() => {
    esArchiverLoad('timeline');
    cy.server();
    cy.route('PATCH', '**/api/timeline').as('timeline');
    cy.route('POST', '**api/timeline/_export?file_name=timelines_export.ndjson*').as('export');
  });

  it('Exports a custom timeline template', async () => {
    loginAndWaitForPageWithoutDateRange(TIMELINE_TEMPLATES_URL);
    openTimelineUsingToggle();
    createNewTimelineTemplate();
    addNameToTimeline(timelineTemplate.title);
    closeTimeline();

    const result = await cy.wait('@timeline').promisify();

    const timelineId = JSON.parse(result.xhr.responseText).data.persistTimeline.timeline
      .savedObjectId;
    const templateTimelineId = JSON.parse(result.xhr.responseText).data.persistTimeline.timeline
      .templateTimelineId;

    await exportTimeline(timelineId);

    cy.wait('@export').then((response) => {
      cy.wrap(JSON.parse(response.xhr.responseText).templateTimelineId).should(
        'eql',
        templateTimelineId
      );
    });
  });
});
