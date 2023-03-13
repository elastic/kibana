/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TIMELINE_SEARCHBOX, EUI_SELECTABLE_LIST_ITEM } from '../screens/common/controls';

import {
  BULK_ACTIONS_BTN,
  BULK_ACTIONS_PROGRESS_BTN,
  MODAL_CONFIRMATION_TITLE,
  MODAL_CONFIRMATION_BODY,
  TOASTER_BODY,
  RULES_TAGS_FILTER_BTN,
} from '../screens/alerts_detection_rules';

import {
  INDEX_PATTERNS_RULE_BULK_MENU_ITEM,
  ADD_INDEX_PATTERNS_RULE_BULK_MENU_ITEM,
  ADD_RULE_ACTIONS_MENU_ITEM,
  DELETE_INDEX_PATTERNS_RULE_BULK_MENU_ITEM,
  TAGS_RULE_BULK_MENU_ITEM,
  ADD_TAGS_RULE_BULK_MENU_ITEM,
  DELETE_TAGS_RULE_BULK_MENU_ITEM,
  RULES_BULK_EDIT_FORM_TITLE,
  RULES_BULK_EDIT_INDEX_PATTERNS,
  RULES_BULK_EDIT_TAGS,
  RULES_BULK_EDIT_FORM_CONFIRM_BTN,
  APPLY_TIMELINE_RULE_BULK_MENU_ITEM,
  RULES_BULK_EDIT_OVERWRITE_TAGS_CHECKBOX,
  RULES_BULK_EDIT_OVERWRITE_INDEX_PATTERNS_CHECKBOX,
  RULES_BULK_EDIT_OVERWRITE_DATA_VIEW_CHECKBOX,
  RULES_BULK_EDIT_TIMELINE_TEMPLATES_SELECTOR,
  UPDATE_SCHEDULE_MENU_ITEM,
  UPDATE_SCHEDULE_INTERVAL_INPUT,
  UPDATE_SCHEDULE_TIME_UNIT_SELECT,
  UPDATE_SCHEDULE_LOOKBACK_INPUT,
  RULES_BULK_EDIT_SCHEDULES_WARNING,
  RULES_BULK_EDIT_OVERWRITE_ACTIONS_CHECKBOX,
  RULES_BULK_EDIT_ACTIONS_THROTTLE_INPUT,
} from '../screens/rules_bulk_edit';
import { SCHEDULE_DETAILS } from '../screens/rule_details';

export const clickApplyTimelineTemplatesMenuItem = () => {
  cy.get(BULK_ACTIONS_BTN).click();
  cy.get(APPLY_TIMELINE_RULE_BULK_MENU_ITEM).click().should('not.exist');
};

const clickIndexPatternsMenuItem = () => {
  cy.get(BULK_ACTIONS_BTN).click();
  cy.get(INDEX_PATTERNS_RULE_BULK_MENU_ITEM).click().should('not.exist');
};

const clickTagsMenuItem = () => {
  cy.get(BULK_ACTIONS_BTN).click();
  cy.get(TAGS_RULE_BULK_MENU_ITEM).click();
};

export const clickAddTagsMenuItem = () => {
  clickTagsMenuItem();
  cy.get(ADD_TAGS_RULE_BULK_MENU_ITEM).click();
};

export const clickUpdateScheduleMenuItem = () => {
  cy.get(BULK_ACTIONS_BTN).click();
  cy.get(UPDATE_SCHEDULE_MENU_ITEM).click().should('not.exist');
};

export const clickAddIndexPatternsMenuItem = () => {
  clickIndexPatternsMenuItem();
  cy.get(ADD_INDEX_PATTERNS_RULE_BULK_MENU_ITEM).click();
};

export const openBulkEditAddIndexPatternsForm = () => {
  clickAddIndexPatternsMenuItem();

  cy.get(RULES_BULK_EDIT_FORM_TITLE).should('have.text', 'Add index patterns');
};

export const openBulkEditRuleActionsForm = () => {
  cy.get(BULK_ACTIONS_BTN).click();
  cy.get(ADD_RULE_ACTIONS_MENU_ITEM).click();

  cy.get(RULES_BULK_EDIT_FORM_TITLE).should('have.text', 'Add rule actions');
};

export const openBulkEditDeleteIndexPatternsForm = () => {
  cy.get(BULK_ACTIONS_BTN).click();
  cy.get(INDEX_PATTERNS_RULE_BULK_MENU_ITEM).click();
  cy.get(DELETE_INDEX_PATTERNS_RULE_BULK_MENU_ITEM).click();

  cy.get(RULES_BULK_EDIT_FORM_TITLE).should('have.text', 'Delete index patterns');
};

export const openBulkEditAddTagsForm = () => {
  clickAddTagsMenuItem();

  cy.get(RULES_BULK_EDIT_FORM_TITLE).should('have.text', 'Add tags');
};

export const openBulkEditDeleteTagsForm = () => {
  clickTagsMenuItem();
  cy.get(DELETE_TAGS_RULE_BULK_MENU_ITEM).click();

  cy.get(RULES_BULK_EDIT_FORM_TITLE).should('have.text', 'Delete tags');
};

export const openBulkActionsMenu = () => {
  cy.get(BULK_ACTIONS_BTN).click();
};

export const typeIndexPatterns = (indices: string[]) => {
  cy.get(RULES_BULK_EDIT_INDEX_PATTERNS).find('input').type(indices.join('{enter}'));
};

export const typeTags = (tags: string[]) => {
  cy.get(RULES_BULK_EDIT_TAGS).find('input').type(tags.join('{enter}'));
};

export const openTagsSelect = () => {
  cy.get(RULES_BULK_EDIT_TAGS).find('input').click();
};

export const submitBulkEditForm = () => cy.get(RULES_BULK_EDIT_FORM_CONFIRM_BTN).click();

export const waitForBulkEditActionToFinish = ({
  updatedCount,
  skippedCount,
  failedCount,
  showDataViewsWarning = false,
}: {
  updatedCount?: number;
  skippedCount?: number;
  failedCount?: number;
  showDataViewsWarning?: boolean;
}) => {
  cy.get(BULK_ACTIONS_PROGRESS_BTN).should('be.disabled');

  if (updatedCount !== undefined) {
    cy.contains(TOASTER_BODY, `You've successfully updated ${updatedCount} rule`);
  }
  if (failedCount !== undefined) {
    if (failedCount === 1) {
      cy.contains(TOASTER_BODY, `${failedCount} rule failed to update`);
    } else {
      cy.contains(TOASTER_BODY, `${failedCount} rules failed to update`);
    }
  }
  if (skippedCount !== undefined) {
    if (skippedCount === 1) {
      cy.contains(TOASTER_BODY, `${skippedCount} rule was skipped`);
    } else {
      cy.contains(TOASTER_BODY, `${skippedCount} rules were skipped`);
    }
    if (showDataViewsWarning) {
      cy.contains(
        TOASTER_BODY,
        'If you did not select to apply changes to rules using Kibana data views, those rules were not updated and will continue using data views.'
      );
    }
  }
};

export const checkPrebuiltRulesCannotBeModified = (rulesCount: number) => {
  cy.get(MODAL_CONFIRMATION_BODY).contains(
    `${rulesCount} prebuilt Elastic rules (editing prebuilt rules is not supported)`
  );
};

export const checkMachineLearningRulesCannotBeModified = (rulesCount: number) => {
  cy.get(MODAL_CONFIRMATION_BODY).contains(
    `${rulesCount} custom machine learning rule (these rules don't have index patterns)`
  );
};

export const waitForMixedRulesBulkEditModal = (customRulesCount: number) => {
  cy.get(MODAL_CONFIRMATION_TITLE).should(
    'have.text',
    `This action can only be applied to ${customRulesCount} custom rules`
  );
};

export const checkOverwriteTagsCheckbox = () => {
  cy.get(RULES_BULK_EDIT_OVERWRITE_TAGS_CHECKBOX)
    .should('have.text', "Overwrite all selected rules' tags")
    .click()
    .get('input')
    .should('be.checked');
};

export const checkOverwriteIndexPatternsCheckbox = () => {
  cy.get(RULES_BULK_EDIT_OVERWRITE_INDEX_PATTERNS_CHECKBOX)
    .should('have.text', "Overwrite all selected rules' index patterns")
    .click()
    .get('input')
    .should('be.checked');
};

export const checkOverwriteRuleActionsCheckbox = () => {
  cy.get(RULES_BULK_EDIT_OVERWRITE_ACTIONS_CHECKBOX)
    .should('have.text', 'Overwrite all selected rules actions')
    .find('input')
    .click({ force: true })
    .should('be.checked');
};

export const checkOverwriteDataViewCheckbox = () => {
  cy.get(RULES_BULK_EDIT_OVERWRITE_DATA_VIEW_CHECKBOX)
    .should('have.text', 'Apply changes to rules configured with data views')
    .click()
    .get('input')
    .should('be.checked');
};

export const selectTimelineTemplate = (timelineTitle: string) => {
  cy.get(RULES_BULK_EDIT_TIMELINE_TEMPLATES_SELECTOR).click();
  cy.get(TIMELINE_SEARCHBOX).type(`${timelineTitle}{enter}`).should('not.exist');
};

/**
 * check if rule tags filter populated with a list of tags
 * @param tags
 */
export const checkTagsInTagsFilter = (tags: string[]) => {
  cy.get(RULES_TAGS_FILTER_BTN).contains(`Tags${tags.length}`).click();

  cy.get(EUI_SELECTABLE_LIST_ITEM)
    .should('have.length', tags.length)
    .each(($el, index) => {
      cy.wrap($el).should('have.text', tags[index]);
    });
};

export const typeScheduleInterval = (interval: string) => {
  cy.get(UPDATE_SCHEDULE_INTERVAL_INPUT)
    .find('input')
    .type('{selectAll}')
    .type(interval.toString())
    .blur();
};

export const typeScheduleLookback = (lookback: string) => {
  cy.get(UPDATE_SCHEDULE_LOOKBACK_INPUT)
    .find('input')
    .type('{selectAll}', { waitForAnimations: true })
    .type(lookback.toString(), { waitForAnimations: true })
    .blur();
};

interface ScheduleFormFields {
  interval: number;
  lookback: number;
}

export const assertDefaultValuesAreAppliedToScheduleFields = ({
  interval,
  lookback,
}: ScheduleFormFields) => {
  cy.get(UPDATE_SCHEDULE_INTERVAL_INPUT).find('input').should('have.value', interval);
  cy.get(UPDATE_SCHEDULE_LOOKBACK_INPUT).find('input').should('have.value', lookback);
};

type TimeUnit = 'Seconds' | 'Minutes' | 'Hours';
export const setScheduleIntervalTimeUnit = (timeUnit: TimeUnit) => {
  cy.get(UPDATE_SCHEDULE_INTERVAL_INPUT).within(() => {
    cy.get(UPDATE_SCHEDULE_TIME_UNIT_SELECT).select(timeUnit);
  });
};

export const setScheduleLookbackTimeUnit = (timeUnit: TimeUnit) => {
  cy.get(UPDATE_SCHEDULE_LOOKBACK_INPUT).within(() => {
    cy.get(UPDATE_SCHEDULE_TIME_UNIT_SELECT).select(timeUnit);
  });
};

export const assertUpdateScheduleWarningExists = (expectedNumberOfNotMLRules: number) => {
  cy.get(RULES_BULK_EDIT_SCHEDULES_WARNING).should(
    'have.text',
    `You're about to apply changes to ${expectedNumberOfNotMLRules} selected rules. The changes you make will overwrite the existing rule schedules and additional look-back time (if any).`
  );
};
interface RuleSchedule {
  interval: string;
  lookback: string;
}

export const assertRuleScheduleValues = ({ interval, lookback }: RuleSchedule) => {
  cy.get(SCHEDULE_DETAILS).within(() => {
    cy.get('dd').eq(0).should('contain.text', interval);
    cy.get('dd').eq(1).should('contain.text', lookback);
  });
};

export const pickActionFrequency = (frequency: string) => {
  cy.get(RULES_BULK_EDIT_ACTIONS_THROTTLE_INPUT).select(frequency);
};
