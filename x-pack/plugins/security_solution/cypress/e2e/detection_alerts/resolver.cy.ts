/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ANALYZER_NODE } from '../../screens/alerts';

import { openAnalyzerForFirstAlertInTimeline } from '../../tasks/alerts';
import { createCustomRuleEnabled } from '../../tasks/api_calls/rules';
import { getNewRule } from '../../objects/rule';
import { cleanKibana } from '../../tasks/common';
import { setStartDate } from '../../tasks/date_picker';
import { TOASTER } from '../../screens/alerts_detection_rules';
import { waitForAlertsToPopulate } from '../../tasks/create_new_rule';
import { login, visit } from '../../tasks/login';
import { ALERTS_URL } from '../../urls/navigation';

describe('Analyze events view for alerts', () => {
  before(() => {
    cleanKibana();
    login();
    createCustomRuleEnabled(getNewRule());
  });
  beforeEach(() => {
    visit(ALERTS_URL);
    waitForAlertsToPopulate();
  });

  it('should render when button is clicked', () => {
    openAnalyzerForFirstAlertInTimeline();
    cy.get(ANALYZER_NODE).first().should('be.visible');
  });

  it(`should display
   a toast indicating the date range of found events when a time range has 0 events in it`, () => {
    const dateContainingZeroEvents = 'Jul 27, 2022 @ 00:00:00.000';
    setStartDate(dateContainingZeroEvents);
    waitForAlertsToPopulate();
    openAnalyzerForFirstAlertInTimeline();
    cy.get(TOASTER).should('be.visible');
    cy.get(ANALYZER_NODE).first().should('be.visible');
  });
});
