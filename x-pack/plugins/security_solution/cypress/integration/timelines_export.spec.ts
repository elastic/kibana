/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { exportTimeline, waitForTimelinesPanelToBeLoaded } from '../tasks/timelines';
import { esArchiverLoad, esArchiverUnload } from '../tasks/es_archiver';
import { loginAndWaitForPageWithoutDateRange } from '../tasks/login';

import { TIMELINES_URL } from '../urls/navigation';

const EXPECTED_EXPORTED_TIMELINE_PATH = 'cypress/test_files/expected_timelines_export.ndjson';

describe('Export timelines', () => {
  before(() => {
    esArchiverLoad('timeline');
    cy.route2('POST', 'api/timeline/_export?file_name=timelines_export.ndjson').as('export');
  });

  after(() => {
    esArchiverUnload('timeline');
  });

  it('Exports a custom timeline', () => {
    loginAndWaitForPageWithoutDateRange(TIMELINES_URL);
    waitForTimelinesPanelToBeLoaded();

    cy.readFile(EXPECTED_EXPORTED_TIMELINE_PATH).then(($expectedExportedJson) => {
      const parsedJson = JSON.parse($expectedExportedJson);
      const timelineId = parsedJson.savedObjectId;
      exportTimeline(timelineId);

      cy.wait('@export').then(({ response }) => {
        // @ts-expect-error statusCode isn't typed properly
        cy.wrap(response.statusCode).should('eql', 200);
        cy.wrap(response.body).should('eql', $expectedExportedJson);
      });
    });
  });
});
