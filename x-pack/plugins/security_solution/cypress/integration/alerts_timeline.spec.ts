/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { PROVIDER_BADGE } from '../screens/timeline';

import { investigateFirstAlertInTimeline, waitForAlertsPanelToBeLoaded } from '../tasks/alerts';
import { removeSignalsIndex } from '../tasks/api_calls/rules';
import { cleanKibana } from '../tasks/common';
import { esArchiverLoad, esArchiverUnload } from '../tasks/es_archiver';
import { loginAndWaitForPage } from '../tasks/login';

import { DETECTIONS_URL } from '../urls/navigation';

describe('Alerts timeline', () => {
  beforeEach(() => {
    cleanKibana();
    removeSignalsIndex();
    esArchiverLoad('timeline_alerts');
    loginAndWaitForPage(DETECTIONS_URL);
  });

  afterEach(() => {
    esArchiverUnload('timeline_alerts');
  });

  it('Investigate alert in default timeline', () => {
    waitForAlertsPanelToBeLoaded();
    investigateFirstAlertInTimeline();
    cy.get(PROVIDER_BADGE)
      .first()
      .invoke('text')
      .then((eventId) => {
        investigateFirstAlertInTimeline();
        cy.get(PROVIDER_BADGE).filter(':visible').should('have.text', eventId);
      });
  });
});
