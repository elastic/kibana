/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expandFirstAlert, waitForAlertsPanelToBeLoaded } from '../../tasks/alerts';
import { closeTimeline } from '../../tasks/timeline';
import { createCustomRuleEnabled } from '../../tasks/api_calls/rules';
import { cleanKibana } from '../../tasks/common';
import { login, visit } from '../../tasks/login';

import { getNewRule } from '../../objects/rule';
import type { CustomRule } from '../../objects/rule';

import { ALERTS_URL } from '../../urls/navigation';
import {
  ALERT_DETAILS_PAGE_BACK_TO_ALERTS,
  OPEN_ALERT_DETAILS_PAGE_CONTEXT_MENU_BTN,
  TIMELINE_CONTEXT_MENU_BTN,
} from '../../screens/alerts';
import { PAGE_TITLE } from '../../screens/common/page';
import { OPEN_ALERT_DETAILS_PAGE } from '../../screens/alerts_details';

describe('Alert Details Page Navigation', () => {
  describe('navigating to alert details page', () => {
    let rule: CustomRule;
    before(() => {
      rule = getNewRule();
      cleanKibana();
      login();
      createCustomRuleEnabled(rule, 'rule1');
      visit(ALERTS_URL);
      waitForAlertsPanelToBeLoaded();
    });

    it('should navigate to the details page from the alert context menu', () => {
      cy.get(TIMELINE_CONTEXT_MENU_BTN).first().click({ force: true });
      // It opens in a new tab by default, for testing purposes, we want it to open in the same tab
      cy.get(OPEN_ALERT_DETAILS_PAGE_CONTEXT_MENU_BTN)
        .invoke('removeAttr', 'target')
        .click({ force: true });
      cy.get(PAGE_TITLE).should('contain.text', rule.name);
      cy.url().should('include', '/summary');
    });

    describe('Context menu action', () => {
      beforeEach(() => {
        visit(ALERTS_URL);
        waitForAlertsPanelToBeLoaded();
      });

      it('should navigate to the details page from the alert flyout', () => {
        // It opens in a new tab by default, for testing purposes, we want it to open in the same tab
        expandFirstAlert();
        cy.get(OPEN_ALERT_DETAILS_PAGE).invoke('removeAttr', 'target').click({ force: true });
        cy.get(PAGE_TITLE).should('contain.text', rule.name);
        cy.url().should('include', '/summary');
      });

      it('should navigate back to the alert table from the details page', () => {
        // It opens in a new tab by default, for testing purposes, we want it to open in the same tab
        expandFirstAlert();
        cy.get(OPEN_ALERT_DETAILS_PAGE).invoke('removeAttr', 'target').click({ force: true });
        cy.get(ALERT_DETAILS_PAGE_BACK_TO_ALERTS).click();
        cy.url().should('include', ALERTS_URL);
        cy.url().should('not.include', 'summary');
      });
    });
  });
});
