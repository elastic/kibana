/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { hasIndexPatterns } from '../../screens/rule_details';

import {
  changeRowsPerPageTo,
  waitForRulesTableToBeLoaded,
  selectAllRules,
  openBulkEditAddIndexPatternsForm,
  openBulkEditDeleteIndexPatternsForm,
  typeIndexPattern,
  waitForBulkEditActionToFinish,
  goToTheRuleDetailsOf,
  confirmBulkEditForm,
  getOverwriteCheckbox,
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

const RULE_NAME = 'Custom rule for bulk actions';

const CUSTOM_INDEX_PATTERN_1 = 'custom-cypress-test-*';
const DEFAULT_INDEX_PATTERNS = ['index-1-*', 'index-2-*'];

const customRule = { ...getNewRule(), index: DEFAULT_INDEX_PATTERNS, name: RULE_NAME };

describe('Detection rules, bulk edit', () => {
  beforeEach(() => {
    cleanKibana();

    createCustomRule(customRule, '1');
    createCustomRule(getExistingRule(), '2');
    createCustomRule(getNewOverrideRule(), '3');
    createCustomRule(getNewThresholdRule(), '4');
    createCustomRule({ ...getNewRule(), name: 'rule # 5' }, '5');
    createCustomRule({ ...getNewRule(), name: 'rule # 6' }, '6');

    loginAndWaitForPageWithoutDateRange(SECURITY_DETECTIONS_RULES_URL);
    waitForRulesTableToBeLoaded();
  });

  describe('Index patterns', () => {
    it('Adds new index pattern to a rule', () => {
      // switch to 5 rules per page, so we can edit all existing rules, not only ones on a page
      changeRowsPerPageTo(5);
      selectAllRules();

      openBulkEditAddIndexPatternsForm();

      typeIndexPattern(CUSTOM_INDEX_PATTERN_1);
      confirmBulkEditForm();

      waitForBulkEditActionToFinish({ rulesCount: 6 });

      changeRowsPerPageTo(20);

      // check if rule has been updated
      goToTheRuleDetailsOf(RULE_NAME);
      hasIndexPatterns([...DEFAULT_INDEX_PATTERNS, CUSTOM_INDEX_PATTERN_1].join(''));
    });

    it('Delete index pattern from all rules', () => {
      // switch to 5 rules per page, so we can edit all existing rules, not only ones on a page
      changeRowsPerPageTo(5);
      selectAllRules();

      openBulkEditDeleteIndexPatternsForm();

      typeIndexPattern(DEFAULT_INDEX_PATTERNS[0]);
      confirmBulkEditForm();

      waitForBulkEditActionToFinish({ rulesCount: 6 });

      changeRowsPerPageTo(20);

      // check if rule has been updated
      goToTheRuleDetailsOf(RULE_NAME);
      hasIndexPatterns(DEFAULT_INDEX_PATTERNS.slice(1).join(''));
    });

    it('Overwrite index patterns for all rules', () => {
      const OVERWRITE_INDEX_PATTERNS = ['overwrite-index-1-*', 'overwrite-index-2-*'];
      // switch to 5 rules per page, so we can edit all existing rules, not only ones on a page
      changeRowsPerPageTo(5);
      selectAllRules();

      openBulkEditAddIndexPatternsForm();

      getOverwriteCheckbox()
        .should('have.text', 'Overwrite all selected rules index patterns')
        .click();

      cy.contains(
        'You’re about to overwrite index patterns for 6 selected rules, press Save to apply changes.'
      );

      OVERWRITE_INDEX_PATTERNS.forEach((index) => {
        typeIndexPattern(index);
      });

      confirmBulkEditForm();

      waitForBulkEditActionToFinish({ rulesCount: 6 });

      changeRowsPerPageTo(20);

      // check if rule has been updated
      goToTheRuleDetailsOf(RULE_NAME);
      hasIndexPatterns(OVERWRITE_INDEX_PATTERNS.join(''));
    });
  });
});
