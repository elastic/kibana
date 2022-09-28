/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expandFirstAlert } from '../../tasks/alerts';
import { setStartDate } from '../../tasks/date_picker';
import { closeTimeline } from '../../tasks/timeline';
import { createCustomRuleEnabled } from '../../tasks/api_calls/rules';
import { cleanKibana } from '../../tasks/common';
import { waitForAlertsToPopulate } from '../../tasks/create_new_rule';
import { login, visitWithoutDateRange } from '../../tasks/login';

import { getNewRule } from '../../objects/rule';
import type { CustomRule } from '../../objects/rule';

import { ALERTS_URL } from '../../urls/navigation';
import {
  ALERT_DETAILS_PAGE_BACK_TO_ALERTS,
  OPEN_ALERT_DETAILS_PAGE_CONTEXT_MENU_BTN,
  TIMELINE_CONTEXT_MENU_BTN,
} from '../../screens/alerts';
import { PAGE_TITLE } from '../../screens/common/page';

describe('Alert Details Page Navigation', () => {
  describe('navigating to alert details page', () => {
    let rule: CustomRule;
    before(() => {
      rule = getNewRule();
      cleanKibana();
      login();
      createCustomRuleEnabled(rule, 'rule1');
      visitWithoutDateRange(ALERTS_URL);
      const dateContainingAllEvents = 'Jul 27, 2015 @ 00:00:00.000';
      setStartDate(dateContainingAllEvents);
      waitForAlertsToPopulate();
    });

    afterEach(() => {
      closeTimeline();
    });

    it('should navigate to the details page from the alert context menu', () => {
      cy.get(TIMELINE_CONTEXT_MENU_BTN).first().click();
      cy.get(OPEN_ALERT_DETAILS_PAGE_CONTEXT_MENU_BTN).click();
      cy.get(PAGE_TITLE).should('contain.text', rule.name);
      cy.url().should('include', '/summary');
    });

    it('should navigate to the details page from the alert flyout', () => {
      visitWithoutDateRange(ALERTS_URL);
      waitForAlertsToPopulate();
      expandFirstAlert();
      cy.get('[data-test-subj="open-alert-details-page"]').click();
      cy.get(PAGE_TITLE).should('contain.text', rule.name);
      cy.url().should('include', '/summary');
    });

    it('should navigate back to the alert table from the details page', () => {
      visitWithoutDateRange(ALERTS_URL);
      waitForAlertsToPopulate();
      expandFirstAlert();
      cy.get('[data-test-subj="open-alert-details-page"]').click();
      cy.get(ALERT_DETAILS_PAGE_BACK_TO_ALERTS).click();
      cy.url().should('include', ALERTS_URL);
      cy.url().should('not.include', 'summary');
    });
  });
});
