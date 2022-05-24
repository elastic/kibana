/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { getNewRule } from '../../objects/rule';

import {
  HOST_TABLE_ROW_TOTAL_ALERTS,
  RULE_TABLE_ROW_TOTAL_ALERTS,
  USER_TABLE_ROW_TOTAL_ALERTS,
} from '../../screens/detection_response';
import { QUERY_TAB_BUTTON } from '../../screens/timeline';
import { createCustomRuleEnabled } from '../../tasks/api_calls/rules';
import { cleanKibana } from '../../tasks/common';
import { login, visit } from '../../tasks/login';
import { closeTimeline } from '../../tasks/timeline';
import { DETECTIONS_RESPONSE_URL } from '../../urls/navigation';

const ALERT_COUNT = 1;

describe.skip('Detection response view', () => {
  context('Open in timeline', () => {
    before(() => {
      cleanKibana();
      login();
      createCustomRuleEnabled(getNewRule());
      visit(DETECTIONS_RESPONSE_URL);
    });

    afterEach(() => {
      closeTimeline();
    });

    it(`opens timeline with correct query count for hosts by alert severity table`, () => {
      cy.get(HOST_TABLE_ROW_TOTAL_ALERTS).click();
      cy.get(QUERY_TAB_BUTTON).should('contain.text', ALERT_COUNT);
    });
    it(`opens timeline with correct query count for users by alert severity table`, () => {
      cy.get(USER_TABLE_ROW_TOTAL_ALERTS).click();
      cy.get(QUERY_TAB_BUTTON).should('contain.text', ALERT_COUNT);
    });
    it(`opens timeline with correct query count for open alerts by rule table`, () => {
      cy.get(RULE_TABLE_ROW_TOTAL_ALERTS).click();
      cy.get(QUERY_TAB_BUTTON).should('contain.text', ALERT_COUNT);
    });
  });
});
