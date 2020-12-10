/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { exportTimeline } from '../tasks/timelines';
import { esArchiverLoad, esArchiverUnload } from '../tasks/es_archiver';
import { loginAndWaitForPageWithoutDateRange } from '../tasks/login';
import { timeline as timelineTemplate } from '../objects/timeline';

import { TIMELINE_TEMPLATES_URL } from '../urls/navigation';
import { addNameToTimeline, closeTimeline, createNewTimelineTemplate } from '../tasks/timeline';

describe('Export timelines', () => {
  before(() => {
    esArchiverLoad('timeline');
    cy.intercept('PATCH', '/api/timeline').as('timeline');
    cy.intercept('POST', '/api/timeline/_export?file_name=timelines_export.ndjson').as('export');
  });

  after(() => {
    esArchiverUnload('timeline');
  });

  it('Exports a custom timeline template', () => {
    loginAndWaitForPageWithoutDateRange(TIMELINE_TEMPLATES_URL);
    createNewTimelineTemplate();
    addNameToTimeline(timelineTemplate.title);
    closeTimeline();

    cy.wait('@timeline').then(({ response }) => {
      const {
        savedObjectId: timelineId,
        templateTimelineId,
      } = response!.body.data.persistTimeline.timeline;

      exportTimeline(timelineId);

      cy.wait('@export').then(({ response: exportResponse }) => {
        cy.wrap(JSON.parse(exportResponse!.body as string).templateTimelineId).should(
          'eql',
          templateTimelineId
        );
      });
    });
  });
});
