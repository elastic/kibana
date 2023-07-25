/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getNewThreatIndicatorRule } from '../../objects/rule';

import {
  duplicateFirstRule,
  duplicateRuleFromMenu,
  goToRuleDetails,
  selectNumberOfRules,
  checkDuplicatedRule,
} from '../../tasks/alerts_detection_rules';
import { duplicateSelectedRulesWithExceptions } from '../../tasks/rules_bulk_actions';
import { createRule } from '../../tasks/api_calls/rules';
import { cleanKibana, deleteAlertsAndRules } from '../../tasks/common';
import { goBackToRuleDetails } from '../../tasks/edit_rule';
import { login, visitWithoutDateRange } from '../../tasks/login';
import { goBackToRulesTable } from '../../tasks/rule_details';

import { DETECTIONS_RULE_MANAGEMENT_URL } from '../../urls/navigation';

describe('indicator match', () => {
  describe('Detection rules, Indicator Match', () => {
    before(() => {
      cleanKibana();
    });

    beforeEach(() => {
      login();
    });

    describe('Duplicates the indicator rule', () => {
      beforeEach(() => {
        login();
        deleteAlertsAndRules();
        createRule(getNewThreatIndicatorRule({ rule_id: 'rule_testing', enabled: true }));
        visitWithoutDateRange(DETECTIONS_RULE_MANAGEMENT_URL);
      });

      it('Allows the rule to be duplicated from the table', () => {
        duplicateFirstRule();
        goBackToRuleDetails();
        goBackToRulesTable();
        checkDuplicatedRule();
      });

      it("Allows the rule to be duplicated from the table's bulk actions", () => {
        selectNumberOfRules(1);
        duplicateSelectedRulesWithExceptions();
        checkDuplicatedRule();
      });

      it('Allows the rule to be duplicated from the edit screen', () => {
        goToRuleDetails();
        duplicateRuleFromMenu();
        goBackToRuleDetails();
        goBackToRulesTable();
        checkDuplicatedRule();
      });
    });
  });
});
