/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  MODAL_CONFIRMATION_BTN,
  MODAL_CONFIRMATION_BODY,
  RULE_CHECKBOX,
  RULES_TAGS_POPOVER_BTN,
  TOASTER_BODY,
  MODAL_ERROR_BODY,
} from '../../screens/alerts_detection_rules';

import {
  RULES_BULK_EDIT_INDEX_PATTERNS_WARNING,
  RULES_BULK_EDIT_TAGS_WARNING,
  RULES_BULK_EDIT_TIMELINE_TEMPLATES_WARNING,
  TAGS_RULE_BULK_MENU_ITEM,
  INDEX_PATTERNS_RULE_BULK_MENU_ITEM,
  APPLY_TIMELINE_RULE_BULK_MENU_ITEM,
} from '../../screens/rules_bulk_edit';

import { TIMELINE_TEMPLATE_DETAILS } from '../../screens/rule_details';

import { EUI_FILTER_SELECT_ITEM } from '../../screens/common/controls';

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
  filterByElasticRules,
  clickErrorToastBtn,
  unselectRuleByName,
  cancelConfirmationModal,
} from '../../tasks/alerts_detection_rules';

import {
  typeIndexPatterns,
  waitForBulkEditActionToFinish,
  submitBulkEditForm,
  clickAddIndexPatternsMenuItem,
  checkPrebuiltRulesCannotBeModified,
  checkMachineLearningRulesCannotBeModified,
  waitForMixedRulesBulkEditModal,
  openBulkEditAddTagsForm,
  openBulkEditDeleteTagsForm,
  typeTags,
  openTagsSelect,
  openBulkActionsMenu,
  clickApplyTimelineTemplatesMenuItem,
  clickAddTagsMenuItem,
  checkOverwriteTagsCheckbox,
  checkOverwriteIndexPatternsCheckbox,
  openBulkEditAddIndexPatternsForm,
  openBulkEditDeleteIndexPatternsForm,
  selectTimelineTemplate,
  checkTagsInTagsFilter,
  clickUpdateScheduleMenuItem,
  typeScheduleInterval,
  typeScheduleLookback,
  setScheduleLookbackTimeUnit,
  setScheduleIntervalTimeUnit,
  assertRuleScheduleValues,
  assertUpdateScheduleWarningExists,
  assertDefaultValuesAreAppliedToScheduleFields,
} from '../../tasks/rules_bulk_edit';

import { hasIndexPatterns, getDetails } from '../../tasks/rule_details';
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
import { loadPrepackagedTimelineTemplates } from '../../tasks/api_calls/timelines';
import { cleanKibana, resetRulesTableState, deleteAlertsAndRules } from '../../tasks/common';

import {
  getEqlRule,
  getNewThreatIndicatorRule,
  getNewRule,
  getNewThresholdRule,
  getMachineLearningRule,
  getNewTermsRule,
} from '../../objects/rule';
import { getIndicatorMatchTimelineTemplate } from '../../objects/timeline';

import { esArchiverResetKibana } from '../../tasks/es_archiver';
import { getAvailablePrebuiltRulesCount } from '../../tasks/api_calls/prebuilt_rules';

const RULE_NAME = 'Custom rule for bulk actions';

const prePopulatedIndexPatterns = ['index-1-*', 'index-2-*'];
const prePopulatedTags = ['test-default-tag-1', 'test-default-tag-2'];

const expectedNumberOfCustomRulesToBeEdited = 6;
const expectedNumberOfMachineLearningRulesToBeEdited = 1;

const timelineTemplate = getIndicatorMatchTimelineTemplate();
/**
 * total number of custom rules that are not Machine learning
 */
const expectedNumberOfNotMLRules =
  expectedNumberOfCustomRulesToBeEdited - expectedNumberOfMachineLearningRulesToBeEdited;
const numberOfRulesPerPage = 5;

const indexDataSource = { index: prePopulatedIndexPatterns, type: 'indexPatterns' } as const;

const defaultRuleData = {
  dataSource: indexDataSource,
  tags: prePopulatedTags,
  timeline: timelineTemplate,
};

describe('Detection rules, bulk edit', () => {
  before(() => {
    cleanKibana();
    login();
  });
  beforeEach(() => {
    // Make sure persisted rules table state is cleared
    resetRulesTableState();
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
    createEventCorrelationRule({ ...getEqlRule(), ...defaultRuleData }, '2');
    createMachineLearningRule({ ...getMachineLearningRule(), ...defaultRuleData });
    createCustomIndicatorRule({ ...getNewThreatIndicatorRule(), ...defaultRuleData }, '4');
    createThresholdRule({ ...getNewThresholdRule(), ...defaultRuleData }, '5');
    createNewTermsRule({ ...getNewTermsRule(), ...defaultRuleData }, '6');

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

    it('Only prebuilt rules selected', () => {
      const expectedNumberOfSelectedRules = 10;

      loadPrebuiltDetectionRulesFromHeaderBtn();

      // select Elastic(prebuilt) rules, check if we can't proceed further, as Elastic rules are not editable
      filterByElasticRules();
      selectNumberOfRules(expectedNumberOfSelectedRules);
      clickApplyTimelineTemplatesMenuItem();

      // check modal window for Elastic rule that can't be edited
      checkPrebuiltRulesCannotBeModified(expectedNumberOfSelectedRules);

      // the confirm button closes modal
      cy.get(MODAL_CONFIRMATION_BTN).should('have.text', 'Close').click();
      cy.get(MODAL_CONFIRMATION_BODY).should('not.exist');
    });

    it('Prebuilt and custom rules selected: user proceeds with custom rules editing', () => {
      loadPrebuiltDetectionRulesFromHeaderBtn();

      // modal window should show how many rules can be edit, how many not
      selectAllRules();
      clickAddTagsMenuItem();
      waitForMixedRulesBulkEditModal(expectedNumberOfCustomRulesToBeEdited);

      getAvailablePrebuiltRulesCount().then((availablePrebuiltRulesCount) => {
        checkPrebuiltRulesCannotBeModified(availablePrebuiltRulesCount);
      });

      // user can proceed with custom rule editing
      cy.get(MODAL_CONFIRMATION_BTN)
        .should('have.text', `Edit ${expectedNumberOfCustomRulesToBeEdited} custom rules`)
        .click();

      // action should finish
      typeTags(['test-tag']);
      submitBulkEditForm();
      waitForBulkEditActionToFinish({ rulesCount: expectedNumberOfCustomRulesToBeEdited });
    });

    it('Prebuilt and custom rules selected: user cancels action', () => {
      loadPrebuiltDetectionRulesFromHeaderBtn();

      // modal window should show how many rules can be edit, how many not
      selectAllRules();
      clickAddTagsMenuItem();
      waitForMixedRulesBulkEditModal(expectedNumberOfCustomRulesToBeEdited);

      getAvailablePrebuiltRulesCount().then((availablePrebuiltRulesCount) => {
        checkPrebuiltRulesCannotBeModified(availablePrebuiltRulesCount);
      });

      // user cancels action and modal disappears
      cancelConfirmationModal();
    });

    it('should not lose rules selection after edit action', () => {
      const rulesCount = 4;
      // Switch to 5 rules per page, to have few pages in pagination(ideal way to test auto refresh and selection of few items)
      changeRowsPerPageTo(numberOfRulesPerPage);
      selectNumberOfRules(rulesCount);

      // open add tags form and add 2 new tags
      openBulkEditAddTagsForm();
      typeTags(prePopulatedTags);
      submitBulkEditForm();
      waitForBulkEditActionToFinish({ rulesCount });

      testMultipleSelectedRulesLabel(rulesCount);
      // check if first four(rulesCount) rules still selected and tags are updated
      for (let i = 0; i < rulesCount; i += 1) {
        cy.get(RULE_CHECKBOX).eq(i).should('be.checked');
        cy.get(RULES_TAGS_POPOVER_BTN)
          .eq(i)
          .each(($el) => {
            testTagsBadge($el, prePopulatedTags);
          });
      }
    });
  });

  describe('Tags actions', () => {
    it('Display list of tags in tags select', () => {
      selectNumberOfRules(expectedNumberOfCustomRulesToBeEdited);

      openBulkEditAddTagsForm();
      openTagsSelect();

      cy.get(EUI_FILTER_SELECT_ITEM)
        .should('have.length', prePopulatedTags.length)
        .each(($el, index) => {
          cy.wrap($el).should('have.text', prePopulatedTags[index]);
        });
    });

    it('Add tags to custom rules', () => {
      const tagsToBeAdded = ['tag-to-add-1', 'tag-to-add-2'];
      const resultingTags = [...prePopulatedTags, ...tagsToBeAdded];

      // check if only pre-populated tags exist in the tags filter
      checkTagsInTagsFilter(prePopulatedTags);

      cy.get(EUI_FILTER_SELECT_ITEM)
        .should('have.length', prePopulatedTags.length)
        .each(($el, index) => {
          cy.wrap($el).should('have.text', prePopulatedTags[index]);
        });

      selectNumberOfRules(expectedNumberOfCustomRulesToBeEdited);

      // open add tags form and add 2 new tags
      openBulkEditAddTagsForm();
      typeTags(tagsToBeAdded);
      submitBulkEditForm();
      waitForBulkEditActionToFinish({ rulesCount: expectedNumberOfCustomRulesToBeEdited });

      // check if all rules have been updated with new tags
      testAllTagsBadges(resultingTags);

      // check that new tags were added to tags filter
      // tags in tags filter sorted alphabetically
      const resultingTagsInFilter = [...resultingTags].sort();
      checkTagsInTagsFilter(resultingTagsInFilter);
    });

    it('Display success toast after adding tags', () => {
      const tagsToBeAdded = ['tag-to-add-1', 'tag-to-add-2'];

      // check if only pre-populated tags exist in the tags filter
      checkTagsInTagsFilter(prePopulatedTags);

      cy.get(EUI_FILTER_SELECT_ITEM)
        .should('have.length', prePopulatedTags.length)
        .each(($el, index) => {
          cy.wrap($el).should('have.text', prePopulatedTags[index]);
        });

      selectNumberOfRules(expectedNumberOfCustomRulesToBeEdited);

      // open add tags form and add 2 new tags
      openBulkEditAddTagsForm();
      typeTags(tagsToBeAdded);
      submitBulkEditForm();
      waitForBulkEditActionToFinish({ rulesCount: expectedNumberOfCustomRulesToBeEdited });

      cy.get(TOASTER_BODY).should(
        'have.text',
        `You've successfully updated ${expectedNumberOfCustomRulesToBeEdited} rules`
      );
    });

    it('Overwrite tags in custom rules', () => {
      const tagsToOverwrite = ['overwrite-tag-1'];

      // check if only pre-populated tags exist in the tags filter
      checkTagsInTagsFilter(prePopulatedTags);

      selectNumberOfRules(expectedNumberOfCustomRulesToBeEdited);

      // open add tags form, check overwrite tags and warning message, type tags
      openBulkEditAddTagsForm();
      checkOverwriteTagsCheckbox();

      cy.get(RULES_BULK_EDIT_TAGS_WARNING).should(
        'have.text',
        `You’re about to overwrite tags for ${expectedNumberOfCustomRulesToBeEdited} selected rules, press Save to apply changes.`
      );

      typeTags(tagsToOverwrite);
      submitBulkEditForm();
      waitForBulkEditActionToFinish({ rulesCount: expectedNumberOfCustomRulesToBeEdited });

      // check if all rules have been updated with new tags
      testAllTagsBadges(tagsToOverwrite);

      // check that only new tags are in the tag filter
      checkTagsInTagsFilter(tagsToOverwrite);
    });

    it('Delete tags from custom rules', () => {
      const tagsToDelete = prePopulatedTags.slice(0, 1);
      const resultingTags = prePopulatedTags.slice(1);

      // check if only pre-populated tags exist in the tags filter
      checkTagsInTagsFilter(prePopulatedTags);

      selectNumberOfRules(expectedNumberOfCustomRulesToBeEdited);

      // open add tags form, check overwrite tags, type tags
      openBulkEditDeleteTagsForm();
      typeTags(tagsToDelete);
      submitBulkEditForm();
      waitForBulkEditActionToFinish({ rulesCount: expectedNumberOfCustomRulesToBeEdited });

      // check tags has been removed from all rules
      testAllTagsBadges(resultingTags);

      // check that tags were removed from the tag filter
      checkTagsInTagsFilter(resultingTags);
    });
  });

  describe('Index patterns', () => {
    it('Index pattern action applied to custom rules, including machine learning: user proceeds with edit of custom non machine learning rule', () => {
      const indexPattersToBeAdded = ['index-to-add-1-*', 'index-to-add-2-*'];
      const resultingIndexPatterns = [...prePopulatedIndexPatterns, ...indexPattersToBeAdded];

      selectNumberOfRules(expectedNumberOfCustomRulesToBeEdited);
      clickAddIndexPatternsMenuItem();

      // confirm editing custom rules, that are not Machine Learning
      checkMachineLearningRulesCannotBeModified(expectedNumberOfMachineLearningRulesToBeEdited);
      cy.get(MODAL_CONFIRMATION_BTN).click();

      typeIndexPatterns(indexPattersToBeAdded);
      submitBulkEditForm();

      waitForBulkEditActionToFinish({ rulesCount: expectedNumberOfNotMLRules });

      // check if rule has been updated
      goToTheRuleDetailsOf(RULE_NAME);
      hasIndexPatterns(resultingIndexPatterns.join(''));
    });

    it('Index pattern action applied to custom rules, including machine learning: user cancels action', () => {
      selectNumberOfRules(expectedNumberOfCustomRulesToBeEdited);
      clickAddIndexPatternsMenuItem();

      // confirm editing custom rules, that are not Machine Learning
      checkMachineLearningRulesCannotBeModified(expectedNumberOfMachineLearningRulesToBeEdited);

      // user cancels action and modal disappears
      cancelConfirmationModal();
    });

    it('Add index patterns to custom rules', () => {
      const indexPattersToBeAdded = ['index-to-add-1-*', 'index-to-add-2-*'];
      const resultingIndexPatterns = [...prePopulatedIndexPatterns, ...indexPattersToBeAdded];

      // select only rules that are not ML
      selectNumberOfRules(expectedNumberOfCustomRulesToBeEdited);
      unselectRuleByName(getMachineLearningRule().name);

      openBulkEditAddIndexPatternsForm();
      typeIndexPatterns(indexPattersToBeAdded);
      submitBulkEditForm();

      waitForBulkEditActionToFinish({ rulesCount: expectedNumberOfNotMLRules });

      // check if rule has been updated
      goToTheRuleDetailsOf(RULE_NAME);
      hasIndexPatterns(resultingIndexPatterns.join(''));
    });

    it('Display success toast after editing the index pattern', () => {
      const indexPattersToBeAdded = ['index-to-add-1-*', 'index-to-add-2-*'];

      // select only rules that are not ML
      selectNumberOfRules(expectedNumberOfCustomRulesToBeEdited);
      unselectRuleByName(getMachineLearningRule().name);

      openBulkEditAddIndexPatternsForm();
      typeIndexPatterns(indexPattersToBeAdded);
      submitBulkEditForm();

      waitForBulkEditActionToFinish({ rulesCount: expectedNumberOfNotMLRules });

      cy.get(TOASTER_BODY).should(
        'have.text',
        `You've successfully updated ${expectedNumberOfNotMLRules} rules. If you did not select to apply changes to rules using Kibana data views, those rules were not updated and will continue using data views.`
      );
    });

    it('Overwrite index patterns in custom rules', () => {
      const indexPattersToWrite = ['index-to-write-1-*', 'index-to-write-2-*'];

      // select only rules that are not ML
      selectNumberOfRules(expectedNumberOfCustomRulesToBeEdited);
      unselectRuleByName(getMachineLearningRule().name);

      openBulkEditAddIndexPatternsForm();

      // check overwrite index patterns checkbox, ensure warning message is displayed and type index patterns
      checkOverwriteIndexPatternsCheckbox();
      cy.get(RULES_BULK_EDIT_INDEX_PATTERNS_WARNING).should(
        'have.text',
        `You’re about to overwrite index patterns for ${expectedNumberOfNotMLRules} selected rules, press Save to apply changes.`
      );

      typeIndexPatterns(indexPattersToWrite);
      submitBulkEditForm();

      waitForBulkEditActionToFinish({ rulesCount: expectedNumberOfNotMLRules });

      // check if rule has been updated
      goToTheRuleDetailsOf(RULE_NAME);
      hasIndexPatterns(indexPattersToWrite.join(''));
    });

    it('Delete index patterns from custom rules', () => {
      const indexPatternsToDelete = prePopulatedIndexPatterns.slice(0, 1);
      const resultingIndexPatterns = prePopulatedIndexPatterns.slice(1);

      // select only not ML rules
      selectNumberOfRules(expectedNumberOfCustomRulesToBeEdited);
      unselectRuleByName(getMachineLearningRule().name);

      openBulkEditDeleteIndexPatternsForm();
      typeIndexPatterns(indexPatternsToDelete);
      submitBulkEditForm();

      waitForBulkEditActionToFinish({ rulesCount: expectedNumberOfNotMLRules });

      // check if rule has been updated
      goToTheRuleDetailsOf(RULE_NAME);
      hasIndexPatterns(resultingIndexPatterns.join(''));
    });

    it('Delete all index patterns from custom rules', () => {
      // select only rules that are not ML
      selectNumberOfRules(expectedNumberOfCustomRulesToBeEdited);
      unselectRuleByName(getMachineLearningRule().name);

      openBulkEditDeleteIndexPatternsForm();
      typeIndexPatterns(prePopulatedIndexPatterns);
      submitBulkEditForm();

      // error toast should be displayed that that rules edit failed
      cy.contains(TOASTER_BODY, `${expectedNumberOfNotMLRules} rules failed to update.`);

      // on error toast button click display error that index patterns can't be empty
      clickErrorToastBtn();
      cy.contains(MODAL_ERROR_BODY, "Index patterns can't be empty");
    });
  });

  describe('Timeline templates', () => {
    beforeEach(() => {
      loadPrepackagedTimelineTemplates();
    });

    it('Apply timeline template to custom rules', () => {
      const timelineTemplateName = 'Generic Endpoint Timeline';

      selectNumberOfRules(expectedNumberOfCustomRulesToBeEdited);

      // open Timeline template form, check warning, select timeline template
      clickApplyTimelineTemplatesMenuItem();
      cy.get(RULES_BULK_EDIT_TIMELINE_TEMPLATES_WARNING).contains(
        `You're about to apply changes to ${expectedNumberOfCustomRulesToBeEdited} selected rules. If you previously applied Timeline templates to these rules, they will be overwritten or (if you select 'None') reset to none.`
      );
      selectTimelineTemplate(timelineTemplateName);

      submitBulkEditForm();
      waitForBulkEditActionToFinish({ rulesCount: expectedNumberOfCustomRulesToBeEdited });

      // check if timeline template has been updated to selected one
      goToTheRuleDetailsOf(RULE_NAME);
      getDetails(TIMELINE_TEMPLATE_DETAILS).should('have.text', timelineTemplateName);
    });

    it('Reset timeline template to None for custom rules', () => {
      const noneTimelineTemplate = 'None';

      selectNumberOfRules(expectedNumberOfCustomRulesToBeEdited);

      // open Timeline template form, submit form without picking timeline template as None is selected by default
      clickApplyTimelineTemplatesMenuItem();

      submitBulkEditForm();
      waitForBulkEditActionToFinish({ rulesCount: expectedNumberOfCustomRulesToBeEdited });

      // check if timeline template has been updated to selected one, by opening rule that have had timeline prior to editing
      goToTheRuleDetailsOf(RULE_NAME);
      getDetails(TIMELINE_TEMPLATE_DETAILS).should('have.text', noneTimelineTemplate);
    });
  });

  describe('Schedule', () => {
    it('Default values are applied to bulk edit schedule fields', () => {
      selectNumberOfRules(expectedNumberOfCustomRulesToBeEdited);
      clickUpdateScheduleMenuItem();

      assertUpdateScheduleWarningExists(expectedNumberOfCustomRulesToBeEdited);

      assertDefaultValuesAreAppliedToScheduleFields({
        interval: 5,
        lookback: 1,
      });
    });

    it('Updates schedule for custom rules', () => {
      selectNumberOfRules(expectedNumberOfCustomRulesToBeEdited);
      clickUpdateScheduleMenuItem();

      assertUpdateScheduleWarningExists(expectedNumberOfCustomRulesToBeEdited);

      typeScheduleInterval('20');
      setScheduleIntervalTimeUnit('Hours');

      typeScheduleLookback('10');
      setScheduleLookbackTimeUnit('Minutes');

      submitBulkEditForm();
      waitForBulkEditActionToFinish({ rulesCount: expectedNumberOfCustomRulesToBeEdited });

      goToTheRuleDetailsOf(RULE_NAME);

      assertRuleScheduleValues({
        interval: '20h',
        lookback: '10m',
      });
    });

    it('Validates invalid inputs when scheduling for custom rules', () => {
      selectNumberOfRules(expectedNumberOfCustomRulesToBeEdited);
      clickUpdateScheduleMenuItem();

      // Validate invalid values are corrected to minimumValue - for 0 and negative values
      typeScheduleInterval('0');
      setScheduleIntervalTimeUnit('Hours');

      typeScheduleLookback('-5');
      setScheduleLookbackTimeUnit('Seconds');

      submitBulkEditForm();
      waitForBulkEditActionToFinish({ rulesCount: expectedNumberOfCustomRulesToBeEdited });

      goToTheRuleDetailsOf(RULE_NAME);

      assertRuleScheduleValues({
        interval: '1h',
        lookback: '1s',
      });
    });
  });
});
