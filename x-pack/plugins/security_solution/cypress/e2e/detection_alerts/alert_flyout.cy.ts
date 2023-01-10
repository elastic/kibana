/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ALERT_FLYOUT,
  SUMMARY_VIEW_PREVALENCE_CELL,
  SUMMARY_VIEW_INVESTIGATE_IN_TIMELINE_BUTTON,
  INSIGHTS_RELATED_ALERTS_BY_SESSION,
  INSIGHTS_INVESTIGATE_IN_TIMELINE_BUTTON,
  INSIGHTS_RELATED_ALERTS_BY_ANCESTRY,
  INSIGHTS_INVESTIGATE_ANCESTRY_ALERTS_IN_TIMELINE_BUTTON,
} from '../../screens/alerts_details';
import { QUERY_TAB_BUTTON, TIMELINE_TITLE } from '../../screens/timeline';

import { expandFirstAlert } from '../../tasks/alerts';
import { verifyInsightCount } from '../../tasks/alerts_details';
import { setStartDate } from '../../tasks/date_picker';
import { closeTimeline } from '../../tasks/timeline';
import { createCustomRuleEnabled } from '../../tasks/api_calls/rules';
import { cleanKibana } from '../../tasks/common';
import { waitForAlertsToPopulate } from '../../tasks/create_new_rule';
import { login, visitWithoutDateRange } from '../../tasks/login';

import { getNewRule } from '../../objects/rule';

import { ALERTS_URL } from '../../urls/navigation';

describe('Alert Flyout', () => {
  before(() => {
    cleanKibana();
    login();
    createCustomRuleEnabled(getNewRule(), 'rule1');
  });

  beforeEach(() => {
    visitWithoutDateRange(ALERTS_URL);
    const dateContainingAllEvents = 'Jul 27, 2015 @ 00:00:00.000';
    setStartDate(dateContainingAllEvents);
    waitForAlertsToPopulate();
    expandFirstAlert();
  });

  afterEach(() => {
    closeTimeline();
  });

  it('Opens a new timeline investigation (from a prevalence field)', () => {
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

  it('Opens a new timeline investigation (from an insights module)', () => {
    verifyInsightCount({
      tableSelector: INSIGHTS_RELATED_ALERTS_BY_SESSION,
      investigateSelector: INSIGHTS_INVESTIGATE_IN_TIMELINE_BUTTON,
    });
  });

  it('Opens a new timeline investigation with alert ids from the process ancestry', () => {
    verifyInsightCount({
      tableSelector: INSIGHTS_RELATED_ALERTS_BY_ANCESTRY,
      investigateSelector: INSIGHTS_INVESTIGATE_ANCESTRY_ALERTS_IN_TIMELINE_BUTTON,
    });
  });
});
