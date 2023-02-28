/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { closeTimeline } from '../../tasks/timeline';
import { getNewRule } from '../../objects/rule';
import { PROVIDER_BADGE, QUERY_TAB_BUTTON, TIMELINE_TITLE } from '../../screens/timeline';

import { expandFirstAlert, investigateFirstAlertInTimeline } from '../../tasks/alerts';
import { createCustomRuleEnabled } from '../../tasks/api_calls/rules';
import { cleanKibana } from '../../tasks/common';
import { waitForAlertsToPopulate } from '../../tasks/create_new_rule';
import { login, visit } from '../../tasks/login';

import { ALERTS_URL } from '../../urls/navigation';
import {
  ALERT_FLYOUT,
  INSIGHTS_INVESTIGATE_ANCESTRY_ALERTS_IN_TIMELINE_BUTTON,
  INSIGHTS_INVESTIGATE_IN_TIMELINE_BUTTON,
  INSIGHTS_RELATED_ALERTS_BY_ANCESTRY,
  INSIGHTS_RELATED_ALERTS_BY_SESSION,
  SUMMARY_VIEW_INVESTIGATE_IN_TIMELINE_BUTTON,
  SUMMARY_VIEW_PREVALENCE_CELL,
} from '../../screens/alerts_details';
import { verifyInsightCount } from '../../tasks/alerts_details';

describe('Investigate in timeline', { testIsolation: false }, () => {
  before(() => {
    cleanKibana();
    login();
    createCustomRuleEnabled(getNewRule());
    visit(ALERTS_URL);
    waitForAlertsToPopulate();
  });

  describe('From alerts table', () => {
    after(() => {
      closeTimeline();
    });

    it('should open new timeline from alerts table', () => {
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

  describe('From alerts details flyout', () => {
    before(() => {
      expandFirstAlert();
    });

    afterEach(() => {
      closeTimeline();
    });

    it('should open a new timeline from a prevalence field', () => {
      cy.get(SUMMARY_VIEW_PREVALENCE_CELL)
        .first()
        .invoke('text')
        .then((alertCount) => {
          // Click on the first button that lets us investigate in timeline
          cy.get(ALERT_FLYOUT).find(SUMMARY_VIEW_INVESTIGATE_IN_TIMELINE_BUTTON).first().click();

          // Make sure a new timeline is created and opened
          cy.get(TIMELINE_TITLE).should('contain.text', 'Untitled timeline');

          // The alert count in this timeline should match the count shown on the alert flyout
          cy.get(QUERY_TAB_BUTTON).should('contain.text', alertCount);
        });
    });

    it('should open a new timeline from an insights module', () => {
      verifyInsightCount({
        tableSelector: INSIGHTS_RELATED_ALERTS_BY_SESSION,
        investigateSelector: INSIGHTS_INVESTIGATE_IN_TIMELINE_BUTTON,
      });
    });

    it('should open a new timeline with alert ids from the process ancestry', () => {
      verifyInsightCount({
        tableSelector: INSIGHTS_RELATED_ALERTS_BY_ANCESTRY,
        investigateSelector: INSIGHTS_INVESTIGATE_ANCESTRY_ALERTS_IN_TIMELINE_BUTTON,
      });
    });
  });
});
