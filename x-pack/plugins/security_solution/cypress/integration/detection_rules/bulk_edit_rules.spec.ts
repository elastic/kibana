/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ELASTIC_RULES_BTN,
  CUSTOM_RULES_BTN,
  MODAL_CONFIRMATION_BTN,
  SELECT_ALL_RULES_ON_PAGE_CHECKBOX,
  LOAD_PREBUILT_RULES_ON_PAGE_HEADER_BTN,
  RULES_TAGS_FILTER_BTN,
} from '../../screens/alerts_detection_rules';

import {
  RULES_BULK_EDIT_OVERWRITE_INDEX_PATTERNS_CHECKBOX,
  RULES_BULK_EDIT_OVERWRITE_TAGS_CHECKBOX,
  RULES_BULK_EDIT_INDEX_PATTERNS_WARNING,
  RULES_BULK_EDIT_TAGS_WARNING,
} from '../../screens/rules_bulk_edit';

import {
  changeRowsPerPageTo,
  waitForRulesTableToBeLoaded,
  selectAllRules,
  goToTheRuleDetailsOf,
  waitForRulesTableToBeRefreshed,
  selectNumberOfRules,
  testAllTagsBadges,
} from '../../tasks/alerts_detection_rules';

import {
  openBulkEditAddIndexPatternsForm,
  openBulkEditDeleteIndexPatternsForm,
  typeIndexPatterns,
  waitForBulkEditActionToFinish,
  confirmBulkEditForm,
  clickAddIndexPatternsMenuItem,
  waitForElasticRulesBulkEditModal,
  waitForMixedRulesBulkEditModal,
  openBulkEditAddTagsForm,
  openBulkEditDeleteTagsForm,
  typeTags,
} from '../../tasks/rules_bulk_edit';

import { hasIndexPatterns } from '../../tasks/rule_details';
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
const TAGS = ['cypress-tag-1', 'cypress-tag-2'];
const OVERWRITE_INDEX_PATTERNS = ['overwrite-index-1-*', 'overwrite-index-2-*'];

const customRule = {
  ...getNewRule(),
  index: DEFAULT_INDEX_PATTERNS,
  name: RULE_NAME,
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
    cy.get(LOAD_PREBUILT_RULES_ON_PAGE_HEADER_BTN)
      .pipe(($el) => $el.trigger('click'))
      .should('not.exist');

    // select few Elastic rules, check if we can't proceed further, as ELastic rules are not editable
    // filter rules, only Elastic rule to show
    cy.get(ELASTIC_RULES_BTN).click();
    waitForRulesTableToBeRefreshed();

    // check modal window for few selected rules
    selectNumberOfRules(5);
    clickAddIndexPatternsMenuItem();
    waitForElasticRulesBulkEditModal(5);
    cy.get(MODAL_CONFIRMATION_BTN).click();

    // Select Elastic rules and custom rules, check mixed rules warning modal window, proceed with editing custom rules
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

  it('should add/delete/overwrite index patterns in rules', () => {
    cy.log('Adds index patterns');
    // Switch to 5 rules per page, so we can edit all existing rules, not only ones on a page
    // this way we will use underlying bulk edit API with query parameter, which update all rules based on query search results
    changeRowsPerPageTo(5);
    selectAllRules();

    openBulkEditAddIndexPatternsForm();
    typeIndexPatterns([CUSTOM_INDEX_PATTERN_1]);
    confirmBulkEditForm();
    waitForBulkEditActionToFinish({ rulesCount: 6 });

    // check if rule has been updated
    changeRowsPerPageTo(20);
    goToTheRuleDetailsOf(RULE_NAME);
    hasIndexPatterns([...DEFAULT_INDEX_PATTERNS, CUSTOM_INDEX_PATTERN_1].join(''));
    cy.go('back');

    cy.log('Deletes index patterns');
    // select all rules on page (as page displays all existing rules).
    // this way we will use underlying bulk edit API with ids parameter, which updates rules based their ids
    cy.get(SELECT_ALL_RULES_ON_PAGE_CHECKBOX).click();
    openBulkEditDeleteIndexPatternsForm();
    typeIndexPatterns([CUSTOM_INDEX_PATTERN_1]);
    confirmBulkEditForm();
    waitForBulkEditActionToFinish({ rulesCount: 6 });

    // check if rule has been updated
    goToTheRuleDetailsOf(RULE_NAME);
    hasIndexPatterns(DEFAULT_INDEX_PATTERNS.join(''));
    cy.go('back');

    cy.log('Overwrites index patterns');
    cy.get(SELECT_ALL_RULES_ON_PAGE_CHECKBOX).click();
    openBulkEditAddIndexPatternsForm();
    cy.get(RULES_BULK_EDIT_OVERWRITE_INDEX_PATTERNS_CHECKBOX)
      .should('have.text', 'Overwrite all selected rules index patterns')
      .click();
    cy.get(RULES_BULK_EDIT_INDEX_PATTERNS_WARNING).should(
      'have.text',
      'You’re about to overwrite index patterns for 6 selected rules, press Save to apply changes.'
    );
    typeIndexPatterns(OVERWRITE_INDEX_PATTERNS);
    confirmBulkEditForm();
    waitForBulkEditActionToFinish({ rulesCount: 6 });

    // check if rule has been updated
    goToTheRuleDetailsOf(RULE_NAME);
    hasIndexPatterns(OVERWRITE_INDEX_PATTERNS.join(''));
  });

  it('should add/delete/overwrite tags in rules', () => {
    cy.log('Add tags to all rules');
    // Switch to 5 rules per page, so we can edit all existing rules, not only ones on a page
    // this way we will use underlying bulk edit API with query parameter, which update all rules based on query search results
    changeRowsPerPageTo(5);
    selectAllRules();

    // open add tags form and add 2 new tags
    openBulkEditAddTagsForm();
    typeTags(TAGS);
    confirmBulkEditForm();
    waitForBulkEditActionToFinish({ rulesCount: 6 });

    // check if all rules have been updated with new tags
    changeRowsPerPageTo(20);
    testAllTagsBadges(TAGS);
    // test how many tags exist and displayed in filter button
    cy.get(RULES_TAGS_FILTER_BTN).contains(/Tags2/);

    cy.log('Remove one tag from all rules');
    // select all rules on page (as page displays all existing rules).
    // this way we will use underlying bulk edit API with query parameter, which update all rules based on query search results
    cy.get(SELECT_ALL_RULES_ON_PAGE_CHECKBOX).click();

    openBulkEditDeleteTagsForm();
    typeTags([TAGS[0]]);
    confirmBulkEditForm();
    waitForBulkEditActionToFinish({ rulesCount: 6 });

    testAllTagsBadges(TAGS.slice(1));
    cy.get(RULES_TAGS_FILTER_BTN).contains(/Tags1/);

    cy.log('Overwrite all tags');
    openBulkEditAddTagsForm();
    cy.get(RULES_BULK_EDIT_OVERWRITE_TAGS_CHECKBOX)
      .should('have.text', 'Overwrite all selected rules tags')
      .click();
    cy.get(RULES_BULK_EDIT_TAGS_WARNING).should(
      'have.text',
      'You’re about to overwrite tags for 6 selected rules, press Save to apply changes.'
    );
    typeTags(['overwrite-tag']);
    confirmBulkEditForm();
    waitForBulkEditActionToFinish({ rulesCount: 6 });

    testAllTagsBadges(['overwrite-tag']);
  });
});
