/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { hasIndexPatterns } from '../../screens/rule_details';

import {
  ELASTIC_RULES_BTN,
  CUSTOM_RULES_BTN,
  MODAL_CONFIRMATION_BTN,
  SELECT_ALL_RULES_ON_PAGE_CHECKBOX,
  LOAD_PREBUILT_RULES_ON_PAGE_HEADER_BTN,
  RULES_BULK_EDIT_OVERWRITE_INDEX_PATTERNS_CHECKBOX,
  RULES_BULK_EDIT_OVERWRITE_TAGS_CHECKBOX,
  RULES_BULK_EDIT_FORM_CONFIRM_BTN,
} from '../../screens/alerts_detection_rules';

import {
  changeRowsPerPageTo,
  waitForRulesTableToBeLoaded,
  selectAllRules,
  openBulkEditAddIndexPatternsForm,
  openBulkEditDeleteIndexPatternsForm,
  typeIndexPatterns,
  waitForBulkEditActionToFinish,
  goToTheRuleDetailsOf,
  confirmBulkEditForm,
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

  it('should show modal windows when Elastic rules selected and edit only custom rules', () => {
    cy.get(LOAD_PREBUILT_RULES_ON_PAGE_HEADER_BTN).click().should('not.exist');

    // select few Elastic rules, check if we can't proceed further, as ELastic rules are not editable
    // filter rules, only Elastic rule to show
    cy.get(ELASTIC_RULES_BTN).click();
    waitForRulesTableToBeRefreshed();

    // check modal window for few selected rules
    selectNumberOfRules(5);
    clickAddIndexPatternsMenuItem();
    waitForElasticRulesBulkEditModal(5);
    cy.get(MODAL_CONFIRMATION_BTN).click();

    // Select Elastic rules and custom rules, warning modal window, proceed with editing custom rules
    cy.get(ELASTIC_RULES_BTN).click();

    selectAllRules();
    clickAddIndexPatternsMenuItem();
    waitForMixedRulesBulkEditModal(totalNumberOfPrebuiltRules, 6);
    cy.get(MODAL_CONFIRMATION_BTN).should('have.text', 'Edit custom rules').click();

    typeIndexPatterns([CUSTOM_INDEX_PATTERN_1]);
    confirmBulkEditForm();

    // check if rule has been updated
    cy.get(CUSTOM_RULES_BTN).click();
    goToTheRuleDetailsOf(RULE_NAME);
    hasIndexPatterns([...DEFAULT_INDEX_PATTERNS, CUSTOM_INDEX_PATTERN_1].join(''));
  });

  it('Adds/delete/overwrite index patterns in rules', () => {
    // First step: add index patterns to all rules
    // Switch to 5 rules per page, so we can edit all existing rules, not only ones on a page
    // this way we will use underlying bulk edit API with query parameter, which update all rules based on query search results
    changeRowsPerPageTo(5);
    selectAllRules();

    openBulkEditAddIndexPatternsForm();

    typeIndexPatterns([CUSTOM_INDEX_PATTERN_1]);
    confirmBulkEditForm();

    waitForBulkEditActionToFinish({ rulesCount: 6 });

    changeRowsPerPageTo(20);

    // check if rule has been updated
    goToTheRuleDetailsOf(RULE_NAME);
    hasIndexPatterns([...DEFAULT_INDEX_PATTERNS, CUSTOM_INDEX_PATTERN_1].join(''));

    cy.go('back');

    // Second step: remove one index pattern
    // select all rules on page (as page displays all existing rules).
    // This way we also test bulk edit with rules ids parameter instead if a query.
    cy.get(SELECT_ALL_RULES_ON_PAGE_CHECKBOX).click();
    openBulkEditDeleteIndexPatternsForm();

    typeIndexPatterns([CUSTOM_INDEX_PATTERN_1]);
    confirmBulkEditForm();

    waitForBulkEditActionToFinish({ rulesCount: 6 });

    // check if rule has been updated
    goToTheRuleDetailsOf(RULE_NAME);
    hasIndexPatterns(DEFAULT_INDEX_PATTERNS.join(''));

    cy.go('back');

    // Third step: overwrite index patterns
    const OVERWRITE_INDEX_PATTERNS = ['overwrite-index-1-*', 'overwrite-index-2-*'];

    cy.get(SELECT_ALL_RULES_ON_PAGE_CHECKBOX).click();
    openBulkEditAddIndexPatternsForm();
    cy.get(RULES_BULK_EDIT_OVERWRITE_INDEX_PATTERNS_CHECKBOX)
      .should('have.text', 'Overwrite all selected rules index patterns')
      .click();

    cy.contains(
      'You’re about to overwrite index patterns for 6 selected rules, press Save to apply changes.'
    );

    typeIndexPatterns(OVERWRITE_INDEX_PATTERNS);
    confirmBulkEditForm();
    waitForBulkEditActionToFinish({ rulesCount: 6 });

    // check if rule has been updated
    goToTheRuleDetailsOf(RULE_NAME);
    hasIndexPatterns(OVERWRITE_INDEX_PATTERNS.join(''));
  });

  it('Adds/deletes/overwrites tags in rules', () => {
    // First step: add tags to all rules
    // Switch to 5 rules per page, so we can edit all existing rules, not only ones on a page
    // this way we will use underlying bulk edit API with query parameter, which update all rules based on query search results
    changeRowsPerPageTo(5);
    selectAllRules();

    // open add tags from and add save 2 new tags
    openBulkEditAddTagsForm();
    typeTags(['tag1', 'tag2']);
    confirmBulkEditForm();
    waitForBulkEditActionToFinish({ rulesCount: 6 });

    // check if all rules have been updated
    changeRowsPerPageTo(20);
    testAllTagsBadges(['tag1', 'tag2']);

    // Second step: remove one tag from all rules
    // select all rules on page (as page displays all existing rules).
    // This way we also test bulk edit with rules ids parameter instead if a query.
    cy.get(SELECT_ALL_RULES_ON_PAGE_CHECKBOX).click();

    openBulkEditDeleteTagsForm();
    typeTags(['tag1']);
    confirmBulkEditForm();
    waitForBulkEditActionToFinish({ rulesCount: 6 });
    testAllTagsBadges(['tag2']);

    // Third step: overwrite all tags

    openBulkEditAddTagsForm();
    cy.get(RULES_BULK_EDIT_OVERWRITE_TAGS_CHECKBOX)
      .should('have.text', 'Overwrite all selected rules tags')
      .click();
    cy.contains(
      'You’re about to overwrite tags for 6 selected rules, press Save to apply changes.'
    );

    typeTags(['overwrite-tag']);
    confirmBulkEditForm();
    waitForBulkEditActionToFinish({ rulesCount: 6 });
    testAllTagsBadges(['overwrite-tag']);
  });
});
