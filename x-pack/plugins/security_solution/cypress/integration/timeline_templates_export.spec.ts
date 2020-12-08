/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { TimelineResult } from '../../server/graphql/types';
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
  let template: TimelineResult;
  before(async () => {
    cy.intercept('POST', '/api/timeline/_export?file_name=timelines_export.ndjson').as('export');
    template = await createTimelineTemplate(timelineTemplate);
  });

  after(() => {
    if (template && template.savedObjectId) {
      deleteTimelineTemplate(template.savedObjectId);
    }
  });

  it('Exports a custom timeline template', () => {
    loginAndWaitForPageWithoutDateRange(TIMELINE_TEMPLATES_URL);

    const jsonTemplate = template;
    exportTimeline(jsonTemplate.savedObjectId);
    cy.wait('@export').then(({ response: exportResponse }) => {
      cy.wrap(exportResponse!.body).should('eql', expectedExportedTimelineTemplate(jsonTemplate));
    });
  });
});
