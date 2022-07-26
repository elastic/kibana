/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  MODAL_CONFIRMATION_BTN,
  MODAL_CONFIRMATION_CANCEL_BTN,
  SELECT_ALL_RULES_ON_PAGE_CHECKBOX,
  RULES_TAGS_FILTER_BTN,
  RULE_CHECKBOX,
  RULES_TAGS_POPOVER_BTN,
} from '../../screens/alerts_detection_rules';

import {
  RULES_BULK_EDIT_OVERWRITE_INDEX_PATTERNS_CHECKBOX,
  RULES_BULK_EDIT_OVERWRITE_TAGS_CHECKBOX,
  RULES_BULK_EDIT_INDEX_PATTERNS_WARNING,
  RULES_BULK_EDIT_TAGS_WARNING,
  TAGS_RULE_BULK_MENU_ITEM,
  INDEX_PATTERNS_RULE_BULK_MENU_ITEM,
  APPLY_TIMELINE_RULE_BULK_MENU_ITEM,
} from '../../screens/rules_bulk_edit';

import {
  changeRowsPerPageTo,
  waitForRulesTableToBeLoaded,
  selectAllRules,
  goToTheRuleDetailsOf,
  selectNumberOfRules,
  testAllTagsBadges,
  testTagsBadge,
  testMultipleSelectedRulesLabel,
  loadPrebuiltDetectionRulesFromHeaderBtn,
  switchToElasticRules,
} from '../../tasks/alerts_detection_rules';

import {
  openBulkEditAddIndexPatternsForm,
  openBulkEditDeleteIndexPatternsForm,
  typeIndexPatterns,
  waitForBulkEditActionToFinish,
  confirmBulkEditForm,
  clickAddIndexPatternsMenuItem,
  checkElasticRulesCannotBeModified,
  checkMachineLearningRulesCannotBeModified,
  waitForMixedRulesBulkEditModal,
  openBulkEditAddTagsForm,
  openBulkEditDeleteTagsForm,
  typeTags,
  openBulkActionsMenu,
  clickApplyTimelineTemplatesMenuItem,
  checkOverwriteTagsCheckbox,
} from '../../tasks/rules_bulk_edit';

import { hasIndexPatterns } from '../../tasks/rule_details';
import { login, visitWithoutDateRange } from '../../tasks/login';

import { SECURITY_DETECTIONS_RULES_URL } from '../../urls/navigation';
import {
  createCustomRule,
  createMachineLearningRule,
  createCustomIndicatorRule,
  createEventCorrelationRule,
  createThresholdRule,
  createNewTermsRule,
} from '../../tasks/api_calls/rules';
import { cleanKibana, deleteAlertsAndRules } from '../../tasks/common';
import {
  getEqlRule,
  getNewThreatIndicatorRule,
  getNewRule,
  getNewThresholdRule,
  totalNumberOfPrebuiltRules,
  getMachineLearningRule,
  getNewTermsRule,
} from '../../objects/rule';
import { esArchiverResetKibana } from '../../tasks/es_archiver';

const RULE_NAME = 'Custom rule for bulk actions';

const CUSTOM_INDEX_PATTERN_1 = 'custom-cypress-test-*';
const DEFAULT_INDEX_PATTERNS = ['index-1-*', 'index-2-*'];
const defaultTags = ['test-default-tag-1', 'test-default-tag-2'];
const OVERWRITE_INDEX_PATTERNS = ['overwrite-index-1-*', 'overwrite-index-2-*'];

const expectedNumberOfCustomRulesToBeEdited = 6;
const expectedNumberOfMachineLearningRulesToBeEdited = 1;
const expectedNumberOfNotMLRules =
  expectedNumberOfCustomRulesToBeEdited - expectedNumberOfMachineLearningRulesToBeEdited;
const numberOfRulesPerPage = 5;

const indexDataSource = { index: DEFAULT_INDEX_PATTERNS, type: 'indexPatterns' } as const;

const defaultRuleData = {
  dataSource: indexDataSource,
  tags: defaultTags
}

describe('Detection rules, bulk edit', () => {
  before(() => {
    cleanKibana();
    login();
  });
  beforeEach(() => {
    deleteAlertsAndRules();
    esArchiverResetKibana();
    createCustomRule(
      {
        ...getNewRule(),
        name: RULE_NAME,
        ...defaultRuleData,
      },
      '1'
    );
    createEventCorrelationRule({...getEqlRule(), ...defaultRuleData }, '2');
    createMachineLearningRule({...getMachineLearningRule(),  ...defaultRuleData}, '3');
    createCustomIndicatorRule({...getNewThreatIndicatorRule(), ...defaultRuleData}, '4');
    createThresholdRule({...getNewThresholdRule(),  ...defaultRuleData }, '5');
    createNewTermsRule({...getNewTermsRule(),  ...defaultRuleData} , '6');

    visitWithoutDateRange(SECURITY_DETECTIONS_RULES_URL);

    waitForRulesTableToBeLoaded();
  });

  describe('Prerequisites', () => {
    it('No rules selected', () => {
      openBulkActionsMenu();

      // when no rule selected all bulk edit options should be disabled
      cy.get(TAGS_RULE_BULK_MENU_ITEM).should('be.disabled');
      cy.get(INDEX_PATTERNS_RULE_BULK_MENU_ITEM).should('be.disabled');
      cy.get(APPLY_TIMELINE_RULE_BULK_MENU_ITEM).should('be.disabled');
    });

    it('Only immutable rules selected', () => {
      const expectedNumberOfSelectedRules = 10;

      loadPrebuiltDetectionRulesFromHeaderBtn();

      // select Elastic rules, check if we can't proceed further, as Elastic rules are not editable
      // filter rules, only Elastic rule to show
      switchToElasticRules();
      selectNumberOfRules(expectedNumberOfSelectedRules);
      clickApplyTimelineTemplatesMenuItem();

      // check modal window for Elastic rule that can't be edited
      checkElasticRulesCannotBeModified(expectedNumberOfSelectedRules);

      // the only action available for users to cancel action
      cy.get(MODAL_CONFIRMATION_BTN).should('have.text', 'Close');
      // euiConfirm still renders button but it's not shown
      cy.get(MODAL_CONFIRMATION_CANCEL_BTN).should('have.text', '');
    });

    it('Immutable and custom rules selected', () => {
      loadPrebuiltDetectionRulesFromHeaderBtn();

      // modal window should show how many rules can be edit, how many not
      selectAllRules();
      clickApplyTimelineTemplatesMenuItem();
      waitForMixedRulesBulkEditModal(expectedNumberOfCustomRulesToBeEdited);

      // check rules that cannot be edited for index patterns: immutable and ML
      checkElasticRulesCannotBeModified(totalNumberOfPrebuiltRules);

      // user can proceed with custom rule editing
      cy.get(MODAL_CONFIRMATION_BTN).should(
        'have.text',
        `Edit ${expectedNumberOfCustomRulesToBeEdited} Custom rules`
      );
    });

    it('Index pattern action on Machine learning rules', () => {
      loadPrebuiltDetectionRulesFromHeaderBtn();

      // modal window should show how many rules can be edit, how many not
      selectAllRules();
      clickAddIndexPatternsMenuItem();
      waitForMixedRulesBulkEditModal(expectedNumberOfNotMLRules);

      // check rules that cannot be edited for index patterns: immutable and ML
      checkMachineLearningRulesCannotBeModified(expectedNumberOfMachineLearningRulesToBeEdited);
      checkElasticRulesCannotBeModified(totalNumberOfPrebuiltRules);

      // user can proceed with custom rule editing
      cy.get(MODAL_CONFIRMATION_BTN).should(
        'have.text',
        `Edit ${expectedNumberOfNotMLRules} Custom rules`
      );
    });
  });

  describe('Tags actions', () => {
    it('Add tags to custom rules', () => {
      const tagsToBeAdded = ['tag-to-add-1', 'tag-to-add-2'];

      // check only 2 tags exist in tags filter
      cy.get(RULES_TAGS_FILTER_BTN).contains(/Tags2/);

      selectNumberOfRules(expectedNumberOfCustomRulesToBeEdited);

      // open add tags form and add 2 new tags
      openBulkEditAddTagsForm();
      typeTags(tagsToBeAdded);
      confirmBulkEditForm();
      waitForBulkEditActionToFinish({ rulesCount: expectedNumberOfCustomRulesToBeEdited });

      // check if all rules have been updated with new tags
      testAllTagsBadges([...defaultTags, ...tagsToBeAdded]);

      // check that 2 new tags were added to tags filter
      cy.get(RULES_TAGS_FILTER_BTN).contains(/Tags4/);
    }); 

    it('Overwrite tags in custom rules', () => {
      const tagsToOverwrite = ['overwrite-tag-1'];

      // check only 2 tags exist in tags filter
      cy.get(RULES_TAGS_FILTER_BTN).contains(/Tags2/);

      selectNumberOfRules(expectedNumberOfCustomRulesToBeEdited);

      // open add tags form, check overwrite tags and warning message, type tags
      openBulkEditAddTagsForm();
      checkOverwriteTagsCheckbox();

      cy.get(RULES_BULK_EDIT_TAGS_WARNING).should(
        'have.text',
        `You’re about to overwrite tags for ${expectedNumberOfCustomRulesToBeEdited} selected rules, press Save to apply changes.`);

      typeTags(tagsToOverwrite);
      confirmBulkEditForm();
      waitForBulkEditActionToFinish({ rulesCount: expectedNumberOfCustomRulesToBeEdited });

      // check if all rules have been updated with new tags
      testAllTagsBadges(tagsToOverwrite);

      // check that only 1 new tag is in filters
      cy.get(RULES_TAGS_FILTER_BTN).contains(/Tags1/);
    }); 

    it('Delete tags from custom rules', () => {
      const tagsToDelete = defaultTags.slice(0, 1);
      const tagsLeftNotDeleted= defaultTags.slice(1);

      // check only 2 tags exist in tags filter
      cy.get(RULES_TAGS_FILTER_BTN).contains(/Tags2/);

      selectNumberOfRules(expectedNumberOfCustomRulesToBeEdited);

      // open add tags form, check overwrite tags, type tags
      openBulkEditDeleteTagsForm();
      typeTags(tagsToDelete);
      confirmBulkEditForm();
      waitForBulkEditActionToFinish({ rulesCount: expectedNumberOfCustomRulesToBeEdited });

      // check tags has been removed from all rules
      testAllTagsBadges(tagsLeftNotDeleted);

      // check that only 1 tag left in filters
      cy.get(RULES_TAGS_FILTER_BTN).contains(/Tags1/);
    }); 
  });


  it('should add/delete/overwrite index patterns in rules', () => {
    cy.log('Adds index patterns');
    // Switch to 5(numberOfRulesPerPage) rules per page, so we can edit all existing rules, not only ones on a page
    // this way we will use underlying bulk edit API with query parameter, which update all rules based on query search results
    changeRowsPerPageTo(numberOfRulesPerPage);
    selectAllRules();

    openBulkEditAddIndexPatternsForm();
    typeIndexPatterns([CUSTOM_INDEX_PATTERN_1]);
    confirmBulkEditForm();
    waitForBulkEditActionToFinish({ rulesCount: expectedNumberOfCustomRulesToBeEdited });

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
    waitForBulkEditActionToFinish({ rulesCount: expectedNumberOfCustomRulesToBeEdited });

    // check if rule has been updated
    goToTheRuleDetailsOf(RULE_NAME);
    hasIndexPatterns(DEFAULT_INDEX_PATTERNS.join(''));
    cy.go('back');

    cy.log('Overwrites index patterns');
    cy.get(SELECT_ALL_RULES_ON_PAGE_CHECKBOX).click();
    openBulkEditAddIndexPatternsForm();
    cy.get(RULES_BULK_EDIT_OVERWRITE_INDEX_PATTERNS_CHECKBOX)
      .should('have.text', "Overwrite all selected rules' index patterns")
      .click();
    cy.get(RULES_BULK_EDIT_INDEX_PATTERNS_WARNING).should(
      'have.text',
      `You’re about to overwrite index patterns for ${expectedNumberOfCustomRulesToBeEdited} selected rules, press Save to apply changes.`
    );
    typeIndexPatterns(OVERWRITE_INDEX_PATTERNS);
    confirmBulkEditForm();
    waitForBulkEditActionToFinish({ rulesCount: expectedNumberOfCustomRulesToBeEdited });

    // check if rule has been updated
    goToTheRuleDetailsOf(RULE_NAME);
    hasIndexPatterns(OVERWRITE_INDEX_PATTERNS.join(''));
  });

  it('should not lose rules selection after edit action', () => {
    const rulesCount = 4;
    // Switch to 5 rules per page, to have few pages in pagination(ideal way to test auto refresh and selection of few items)
    changeRowsPerPageTo(numberOfRulesPerPage);
    selectNumberOfRules(rulesCount);

    // open add tags form and add 2 new tags
    openBulkEditAddTagsForm();
    typeTags(defaultTags);
    confirmBulkEditForm();
    waitForBulkEditActionToFinish({ rulesCount });

    testMultipleSelectedRulesLabel(rulesCount);
    // check if first four(rulesCount) rules still selected and tags are updated
    for (let i = 0; i < rulesCount; i += 1) {
      cy.get(RULE_CHECKBOX).eq(i).should('be.checked');
      cy.get(RULES_TAGS_POPOVER_BTN)
        .eq(i)
        .each(($el) => {
          testTagsBadge($el, defaultTags);
        });
    }
  });
});
