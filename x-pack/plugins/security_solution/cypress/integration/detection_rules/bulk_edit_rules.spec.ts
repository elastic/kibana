/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { hasIndexPatterns } from '../../screens/rule_details';

import {
  COLLAPSED_ACTION_BTN,
  ELASTIC_RULES_BTN,
  CUSTOM_RULES_BTN,
  MODAL_CONFIRMATION_BTN,
  pageSelector,
  RELOAD_PREBUILT_RULES_BTN,
  RULES_EMPTY_PROMPT,
  RULE_SWITCH,
  SHOWING_RULES_TEXT,
  RULES_MONITORING_TABLE,
  SELECT_ALL_RULES_ON_PAGE_CHECKBOX,
} from '../../screens/alerts_detection_rules';

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
  loadPrebuiltDetectionRules,
  waitForPrebuiltDetectionRulesToBeLoaded,
  getOverwriteTagsCheckbox,
  waitForRulesTableToBeRefreshed,
  selectNumberOfRules,
  clickAddIndexPatternsMenuItem,
  waitForElasticRulesBulkEditModal,
  waitForMixedRulesBulkEditModal,
  openBulkEditAddTagsForm,
  openBulkEditDeleteTagsForm,
  testAllTagsBadges,
  typeTags,
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
  totalNumberOfPrebuiltRules,
} from '../../objects/rule';

const RULE_NAME = 'Custom rule for bulk actions';

const CUSTOM_INDEX_PATTERN_1 = 'custom-cypress-test-*';
const DEFAULT_INDEX_PATTERNS = ['index-1-*', 'index-2-*'];
const DEFAULT_TAGS = ['default-tag'];

const customRule = {
  ...getNewRule(),
  index: DEFAULT_INDEX_PATTERNS,
  name: RULE_NAME,
  tags: DEFAULT_TAGS,
};

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

  describe('Elastic rules', () => {
    beforeEach(() => {
      cy.get('[data-test-subj="loadPrebuiltRulesBtn"]').click().should('not.exist');
    });

    it('should show modal windows when only Elastic rules selected', () => {
      // filter rules, only Elastic rule to show
      cy.get(ELASTIC_RULES_BTN).click();
      waitForRulesTableToBeRefreshed();

      // check modal window for few selected rules
      selectNumberOfRules(5);

      clickAddIndexPatternsMenuItem();
      waitForElasticRulesBulkEditModal(5);

      // close modal
      cy.get(MODAL_CONFIRMATION_BTN).click();

      selectAllRules();

      clickAddIndexPatternsMenuItem();
      waitForElasticRulesBulkEditModal(totalNumberOfPrebuiltRules);
    });

    it('should show modal window when mixed rules selected and edit only custom', () => {
      selectAllRules();

      clickAddIndexPatternsMenuItem();

      waitForMixedRulesBulkEditModal(totalNumberOfPrebuiltRules, 6);
      cy.get(MODAL_CONFIRMATION_BTN).should('have.text', 'Edit custom rules').click();

      // proceed to form
      cy.get('[data-test-subj="bulkEditFormTitle"]').should('have.text', 'Add index patterns');

      typeIndexPattern(CUSTOM_INDEX_PATTERN_1);
      confirmBulkEditForm();

      // check if rule has been updated
      cy.get(CUSTOM_RULES_BTN).click();
      goToTheRuleDetailsOf(RULE_NAME);
      hasIndexPatterns([...DEFAULT_INDEX_PATTERNS, CUSTOM_INDEX_PATTERN_1].join(''));
    });
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

  describe('tags', () => {
    it.only('Adds new tags to all rules', () => {
      // First step: add tags to all rules
      // switch to 5 rules per page, so we can edit all existing rules, not only ones on a page
      changeRowsPerPageTo(5);
      selectAllRules();
      // open add tags from and add save 2 new tags
      openBulkEditAddTagsForm();
      typeTags(['tag1', 'tag2']);
      confirmBulkEditForm();
      waitForBulkEditActionToFinish({ rulesCount: 6 });
      // check if all rule have been updated
      changeRowsPerPageTo(20);
      testAllTagsBadges(['tag1', 'tag2']);

      // Second step: remove one tag from all rules
      changeRowsPerPageTo(5);
      selectAllRules();

      openBulkEditDeleteTagsForm();
      typeTags(['tag1']);
      confirmBulkEditForm();
      waitForBulkEditActionToFinish({ rulesCount: 6 });

      changeRowsPerPageTo(20);
      testAllTagsBadges(['tag2']);

      // Third step: overwrite all tags
      changeRowsPerPageTo(5);
      selectAllRules();

      openBulkEditAddTagsForm();
      getOverwriteTagsCheckbox().should('have.text', 'Overwrite all selected rules tags').click();

      cy.contains(
        'You’re about to overwrite tags for 6 selected rules, press Save to apply changes.'
      );
      typeTags(['overwrite-tag']);

      confirmBulkEditForm();

      waitForBulkEditActionToFinish({ rulesCount: 6 });

      changeRowsPerPageTo(20);

      // check if all rule have been updated
      testAllTagsBadges(['overwrite-tag']);
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
