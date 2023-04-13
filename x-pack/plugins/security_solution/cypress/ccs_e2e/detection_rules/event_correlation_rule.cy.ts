/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { esArchiverCCSLoad } from '../../tasks/es_archiver';
import { getCCSEqlRule } from '../../objects/rule';

import { ALERTS_COUNT, ALERT_DATA_GRID } from '../../screens/alerts';

import {
  filterByCustomRules,
  goToRuleDetails,
  waitForRulesTableToBeLoaded,
} from '../../tasks/alerts_detection_rules';
import { createRule } from '../../tasks/api_calls/rules';
import { cleanKibana } from '../../tasks/common';
import { waitForAlertsToPopulate, waitForTheRuleToBeExecuted } from '../../tasks/create_new_rule';
import { login, visitWithoutDateRange } from '../../tasks/login';

import { DETECTIONS_RULE_MANAGEMENT_URL } from '../../urls/navigation';

describe('Detection rules', function () {
  const expectedNumberOfAlerts = '1 alert';

  beforeEach('Reset signals index', function () {
    cleanKibana();
  });

  it('EQL rule on remote indices generates alerts', function () {
    esArchiverCCSLoad('linux_process');
    const rule = getCCSEqlRule();
    login();
    createRule(rule);
    visitWithoutDateRange(DETECTIONS_RULE_MANAGEMENT_URL);
    waitForRulesTableToBeLoaded();
    filterByCustomRules();
    goToRuleDetails();
    waitForTheRuleToBeExecuted();
    waitForAlertsToPopulate();

    cy.get(ALERTS_COUNT).should('have.text', expectedNumberOfAlerts);
    cy.get(ALERT_DATA_GRID)
      .invoke('text')
      .then((text) => {
        cy.log('ALERT_DATA_GRID', text);
        expect(text).contains(rule.name);
        expect(text).contains(rule.severity);
        expect(text).contains(rule.risk_score);
      });
  });
});
