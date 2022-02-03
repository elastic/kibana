/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  FIRST_RULE,
  RULE_NAME,
  RULE_SWITCH,
  SECOND_RULE,
  FOURTH_RULE,
  RULES_TABLE,
  pageSelector,
} from '../../screens/alerts_detection_rules';

import { goToManageAlertsDetectionRules, waitForAlertsPanelToBeLoaded } from '../../tasks/alerts';
import {
  activateRule,
  FIRST_RULE,
  enableRule,
  changeRowsPerPageTo,
  checkAutoRefresh,
  goToPage,
  sortByActivatedRules,
  waitForRulesTableToBeLoaded,
  waitForRuleToChangeStatus,
  selectAllRules,
  openAddIndexPatterns,
  addCustomIndexPattern,
  waitForBulkEditActionToFinish,
  goToTheRuleDetailsOf,
} from '../../tasks/alerts_detection_rules';
import { loginAndWaitForPageWithoutDateRange } from '../../tasks/login';

import { SECURITY_DETECTIONS_RULES_URL } from '../../urls/navigation';
import { createCustomRule } from '../../tasks/api_calls/rules';
import { cleanKibana } from '../../tasks/common';
import {
  getExistingRule,
  getNewOverrideRule,
  getNewRule,
  getNewThresholdRule,
} from '../../objects/rule';

const DEFAULT_RULE_REFRESH_INTERVAL_VALUE = 60000;
const RULE_NAME = 'Custom rule for bulk actions';

describe('Detection rules, bulk edit', () => {
  beforeEach(() => {
    cleanKibana();

    createCustomRule({...getNewRule(), name: RULE_NAME}, '1');
    createCustomRule(getExistingRule(), '2');
    createCustomRule(getNewOverrideRule(), '3');
    createCustomRule(getNewThresholdRule(), '4');
    createCustomRule({ ...getNewRule(), name: 'rule # 5' }, '5');
    createCustomRule({ ...getNewRule(), name: 'rule # 6' }, '6');

    loginAndWaitForPageWithoutDateRange(SECURITY_DETECTIONS_RULES_URL);
    waitForRulesTableToBeLoaded();

  });

  it('Adds new index pattern to all rules', () => {
    // switch to 5 rules per page, so we can edit all existing rules, not only ones on a page
    changeRowsPerPageTo(5);
    // enableRule(FIRST_RULE);
    // goToManageAlertsDetectionRules();
    // waitForRulesTableToBeLoaded();

    selectAllRules();

    openAddIndexPatterns();
    cy.get('[data-test-subj="bulkEditFormTitle"]').should('have.text', 'Add index patterns');

    addCustomIndexPattern('cypress-test-*');
    cy.get('[data-test-subj="bulkEditFormSaveBtn"]').click();

    waitForBulkEditActionToFinish({ rulesCount: 6 });

    changeRowsPerPageTo(20);

    goToTheRuleDetailsOf(RULE_NAME);
  });
});
