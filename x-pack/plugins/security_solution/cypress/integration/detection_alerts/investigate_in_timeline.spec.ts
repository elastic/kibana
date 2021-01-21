/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { newRule } from '../../objects/rule';
import { PROVIDER_BADGE } from '../../screens/timeline';

import {
  investigateFirstAlertInTimeline,
  waitForAlertsIndexToBeCreated,
  waitForAlertsPanelToBeLoaded,
} from '../../tasks/alerts';
import { createCustomRuleActivated } from '../../tasks/api_calls/rules';
import { cleanKibana } from '../../tasks/common';
import { waitForAlertsToPopulate } from '../../tasks/create_new_rule';
import { loginAndWaitForPage } from '../../tasks/login';
import { refreshPage } from '../../tasks/security_header';

import { DETECTIONS_URL } from '../../urls/navigation';

describe('Alerts timeline', () => {
  beforeEach(() => {
    cleanKibana();
    loginAndWaitForPage(DETECTIONS_URL);
    waitForAlertsPanelToBeLoaded();
    waitForAlertsIndexToBeCreated();
    createCustomRuleActivated(newRule);
    refreshPage();
    waitForAlertsToPopulate();
  });

  it('Investigate alert in default timeline', () => {
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
