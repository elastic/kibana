/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  goToRuleDetails,
  waitForRulesTableToBeLoaded,
} from '../../../tasks/alerts_detection_rules';
import { SECURITY_DETECTIONS_RULES_URL } from '../../../urls/navigation';
import { login, visitWithoutDateRange } from '../../../tasks/login';
import { ruleFields } from '../../../data/detection_engine';
import { getNewRule } from '../../../objects/rule';
import { ALERTS_COUNT, ALERT_GRID_CELL } from '../../../screens/alerts';

import { createRule } from '../../../tasks/api_calls/rules';
import { cleanKibana, deleteAlertsAndRules } from '../../../tasks/common';
import {
  waitForAlertsToPopulate,
  waitForTheRuleToBeExecuted,
} from '../../../tasks/create_new_rule';

describe('Rule details alerts table', () => {
  before(() => {
    cleanKibana();
  });

  beforeEach(() => {
    deleteAlertsAndRules();
    createRule({
      ...getNewRule({
        rule_id: 'rulez',
        name: ruleFields.ruleName,
        interval: ruleFields.ruleInterval,
        query: ruleFields.ruleQuery,
      }),
    });
    login();
    visitWithoutDateRange(SECURITY_DETECTIONS_RULES_URL);
    waitForRulesTableToBeLoaded();
    goToRuleDetails();
  });

  it('Generates alerts', function () {
    waitForTheRuleToBeExecuted();
    waitForAlertsToPopulate();

    cy.log('Asserting that alerts have been generated after the creation');
    cy.get(ALERTS_COUNT)
      .invoke('text')
      .should('match', /^[1-9].+$/); // Any number of alerts
    cy.get(ALERT_GRID_CELL).contains(ruleFields.ruleName);
  });
});
