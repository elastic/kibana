/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { exportTimeline } from '../../tasks/timelines';
import { loginAndWaitForPageWithoutDateRange } from '../../tasks/login';
import {
  expectedExportedTimelineTemplate,
  timeline as timelineTemplate,
} from '../../objects/timeline';

import { TIMELINE_TEMPLATES_URL } from '../../urls/navigation';
import { createTimelineTemplate } from '../../tasks/api_calls/timelines';
import { cleanKibana } from '../../tasks/common';

describe('Export timelines', () => {
  beforeEach(() => {
    cleanKibana();
    cy.intercept('POST', 'api/timeline/_export?file_name=timelines_export.ndjson').as('export');
    createTimelineTemplate(timelineTemplate).then((response) => {
      cy.wrap(response).as('templateResponse');
      cy.wrap(response.body.data.persistTimeline.timeline.savedObjectId).as('templateId');
    });
  });

  it('Exports a custom timeline template', function () {
    loginAndWaitForPageWithoutDateRange(TIMELINE_TEMPLATES_URL);
    exportTimeline(this.templateId);

    cy.wait('@export').then(({ response }) => {
      cy.wrap(response!.body).should(
        'eql',
        expectedExportedTimelineTemplate(this.templateResponse)
      );
    });
  });
});
