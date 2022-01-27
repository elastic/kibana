/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { esArchiverCCSLoad } from '../../tasks/es_archiver';
import { getCCSEqlRule } from '../../objects/rule';

import { ALERT_DATA_GRID, NUMBER_OF_ALERTS } from '../../screens/alerts';

import {
  filterByCustomRules,
  goToRuleDetails,
  waitForRulesTableToBeLoaded,
} from '../../tasks/alerts_detection_rules';
import { createEventCorrelationRule } from '../../tasks/api_calls/rules';
import { cleanKibana } from '../../tasks/common';
import { waitForAlertsToPopulate, waitForTheRuleToBeExecuted } from '../../tasks/create_new_rule';
import { loginAndWaitForPageWithoutDateRange } from '../../tasks/login';

import { DETECTIONS_RULE_MANAGEMENT_URL } from '../../urls/navigation';

describe('Detection rules', function () {
  const expectedNumberOfAlerts = '1 alert';

  beforeEach('Reset signals index', function () {
    cleanKibana();
  });

  it('EQL rule on remote indices generates alerts', function () {
    esArchiverCCSLoad('linux_process');
    this.rule = getCCSEqlRule();
    createEventCorrelationRule(this.rule);

    loginAndWaitForPageWithoutDateRange(DETECTIONS_RULE_MANAGEMENT_URL);
    waitForRulesTableToBeLoaded();
    filterByCustomRules();
    goToRuleDetails();
    waitForTheRuleToBeExecuted();
    waitForAlertsToPopulate();

    cy.get(NUMBER_OF_ALERTS).should('have.text', expectedNumberOfAlerts);
    cy.get(ALERT_DATA_GRID)
      .invoke('text')
      .then((text) => {
        cy.log('ALERT_DATA_GRID', text);
        expect(text).contains(this.rule.name);
        expect(text).contains(this.rule.severity.toLowerCase());
        expect(text).contains(this.rule.riskScore);
      });
  });
});
