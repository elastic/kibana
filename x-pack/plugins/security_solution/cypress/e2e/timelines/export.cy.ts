/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { exportTimeline, selectAllTimelines, exportSelectedTimelines } from '../../tasks/timelines';
import { login, visitWithoutDateRange } from '../../tasks/login';

import { TIMELINES_URL } from '../../urls/navigation';
import { TOASTER } from '../../screens/alerts_detection_rules';
import {
  TIMELINE_CHECKBOX,
  TIMELINE_ITEM_ACTION_BTN,
  EXPORT_TIMELINE,
} from '../../screens/timelines';
import { createTimeline } from '../../tasks/api_calls/timelines';
import { expectedExportedTimeline, getTimeline } from '../../objects/timeline';
import { cleanKibana, deleteTimelines } from '../../tasks/common';

describe('Export timelines', () => {
  before(() => {
    cleanKibana();
    login();
  });

  beforeEach(() => {
    deleteTimelines();
    cy.intercept({
      method: 'POST',
      path: '/api/timeline/_export?file_name=timelines_export.ndjson',
    }).as('export');
    createTimeline(getTimeline()).then((response) => {
      cy.wrap(response).as('timelineResponse1');
      cy.wrap(response.body.data.persistTimeline.timeline.savedObjectId).as('timelineId1');
    });
    createTimeline(getTimeline()).then((response) => {
      cy.wrap(response).as('timelineResponse2');
      cy.wrap(response.body.data.persistTimeline.timeline.savedObjectId).as('timelineId2');
    });
    visitWithoutDateRange(TIMELINES_URL);
  });

  it('Exports a custom timeline using timeline actions', function () {
    cy.get(TIMELINE_ITEM_ACTION_BTN(this.timelineId1)).click();
    cy.get(EXPORT_TIMELINE).click();

    cy.wait('@export').then(({ response }) => {
      cy.wrap(response?.statusCode).should('eql', 200);
      cy.wrap(response?.body).should('eql', expectedExportedTimeline(this.timelineResponse1));
    });
  });

  it('Exports a custom timeline using bulk action', function () {
    exportTimeline(this.timelineId1);

    cy.wait('@export').then(({ response }) => {
      cy.wrap(response?.statusCode).should('eql', 200);
      cy.wrap(response?.body).should('eql', expectedExportedTimeline(this.timelineResponse1));
    });
  });

  it('Bulk export all created timeline', function () {
    cy.get(TIMELINE_CHECKBOX(this.timelineId1)).should('exist'); // wait for all timelines to be loaded
    selectAllTimelines();
    exportSelectedTimelines();

    const expectedNumberCustomRulesToBeExported = 2;
    cy.get(TOASTER).should(
      'have.text',
      `Successfully exported ${expectedNumberCustomRulesToBeExported} timelines`
    );

    cy.wait('@export').then(({ response }) => {
      cy.wrap(response?.statusCode).should('eql', 200);
      const timelines = response?.body?.split('\n');
      assert.deepEqual(JSON.parse(timelines[0]), expectedExportedTimeline(this.timelineResponse2));
      assert.deepEqual(JSON.parse(timelines[1]), expectedExportedTimeline(this.timelineResponse1));
    });
  });
});
