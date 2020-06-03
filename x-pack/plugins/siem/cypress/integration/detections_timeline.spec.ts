/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ALERT_ID } from '../screens/detections';
import { PROVIDER_BADGE } from '../screens/timeline';

import {
  expandFirstAlert,
  investigateFirstAlertInTimeline,
  waitForAlertsPanelToBeLoaded,
} from '../tasks/detections';
import { esArchiverLoad, esArchiverUnload } from '../tasks/es_archiver';
import { loginAndWaitForPage } from '../tasks/login';

import { DETECTIONS } from '../urls/navigation';

describe('Detections timeline', () => {
  beforeEach(() => {
    esArchiverLoad('timeline_alerts');
    loginAndWaitForPage(DETECTIONS);
  });

  afterEach(() => {
    esArchiverUnload('timeline_alerts');
  });

  it('Investigate alert in default timeline', () => {
    waitForAlertsPanelToBeLoaded();
    expandFirstAlert();
    cy.get(ALERT_ID)
      .first()
      .invoke('text')
      .then((eventId) => {
        investigateFirstAlertInTimeline();
        cy.get(PROVIDER_BADGE).invoke('text').should('eql', `_id: "${eventId}"`);
      });
  });
});
