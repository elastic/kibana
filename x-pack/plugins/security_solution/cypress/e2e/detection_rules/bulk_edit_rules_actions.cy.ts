/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  RULES_BULK_EDIT_ACTIONS_INFO,
  RULES_BULK_EDIT_ACTIONS_WARNING,
} from '../../screens/rules_bulk_edit';

import { cleanKibana, deleteAlertsAndRules } from '../../tasks/common';
import {
  addSlackRuleAction,
  assertSlackRuleAction,
  addEmailConnectorAndRuleAction,
  assertEmailRuleAction,
} from '../../tasks/common/rule_actions';
import {
  waitForRulesTableToBeLoaded,
  selectNumberOfRules,
  loadPrebuiltDetectionRulesFromHeaderBtn,
  goToEditRuleActionsSettings,
} from '../../tasks/alerts_detection_rules';
import {
  waitForBulkEditActionToFinish,
  submitBulkEditForm,
  checkOverwriteRuleActionsCheckbox,
  openBulkEditRuleActionsForm,
  pickActionFrequency,
} from '../../tasks/rules_bulk_edit';
import { assertSelectedActionFrequency } from '../../tasks/edit_rule';
import { login, visitWithoutDateRange } from '../../tasks/login';
import { esArchiverResetKibana } from '../../tasks/es_archiver';

import { SECURITY_DETECTIONS_RULES_URL } from '../../urls/navigation';

import {
  createMachineLearningRule,
  createCustomIndicatorRule,
  createEventCorrelationRule,
  createThresholdRule,
  createNewTermsRule,
  createSavedQueryRule,
  createCustomRuleEnabled,
} from '../../tasks/api_calls/rules';
import { createSlackConnector } from '../../tasks/api_calls/connectors';

import {
  getEqlRule,
  getNewThreatIndicatorRule,
  getNewRule,
  getNewThresholdRule,
  getMachineLearningRule,
  getNewTermsRule,
} from '../../objects/rule';

const expectedNumberOfCustomRulesToBeEdited = 7;
// 7 custom rules of different types + 3 prebuilt.
// number of selected rules doesn't matter, we only want to make sure they will be edited an no modal window displayed as for other actions
const expectedNumberOfRulesToBeEdited = expectedNumberOfCustomRulesToBeEdited + 3;

const expectedSlackMessage = 'Slack action test message';

describe('Detection rules, bulk edit', () => {
  before(() => {
    cleanKibana();
    login();
  });
  beforeEach(() => {
    deleteAlertsAndRules();
    esArchiverResetKibana();

    createCustomRuleEnabled(getNewRule(), '1');
    createEventCorrelationRule(getEqlRule(), '2');
    createMachineLearningRule(getMachineLearningRule(), '3');
    createCustomIndicatorRule(getNewThreatIndicatorRule(), '4');
    createThresholdRule(getNewThresholdRule(), '5');
    createNewTermsRule(getNewTermsRule(), '6');
    createSavedQueryRule({ ...getNewRule(), savedId: 'mocked' }, '7');

    createSlackConnector();
    visitWithoutDateRange(SECURITY_DETECTIONS_RULES_URL);

    waitForRulesTableToBeLoaded();
  });

  context('Restricted privileges', () => {});
  context('Editing custom and prebuilt rules', () => {
    it('Add rule actions to rules', () => {
      const expectedActionFrequency = 'Daily';

      loadPrebuiltDetectionRulesFromHeaderBtn();

      // select both custom and prebuilt rules
      selectNumberOfRules(expectedNumberOfRulesToBeEdited);
      openBulkEditRuleActionsForm();

      // ensure rule actions info callout displayed on the form
      cy.get(RULES_BULK_EDIT_ACTIONS_INFO).should('be.visible');

      pickActionFrequency(expectedActionFrequency);
      addSlackRuleAction(expectedSlackMessage);

      submitBulkEditForm();
      waitForBulkEditActionToFinish({ rulesCount: expectedNumberOfRulesToBeEdited });

      // check if rule has been updated
      goToEditRuleActionsSettings();

      assertSelectedActionFrequency(expectedActionFrequency);
      assertSlackRuleAction(expectedSlackMessage);
    });

    it('Overwrite rule actions in rules', () => {
      const expectedActionFrequency = 'On each rule execution';

      loadPrebuiltDetectionRulesFromHeaderBtn();

      // select both custom and prebuilt rules
      selectNumberOfRules(expectedNumberOfRulesToBeEdited);
      openBulkEditRuleActionsForm();

      pickActionFrequency(expectedActionFrequency);
      addSlackRuleAction(expectedSlackMessage);

      // check overwrite box, ensure warning is displayed
      checkOverwriteRuleActionsCheckbox();
      cy.get(RULES_BULK_EDIT_ACTIONS_WARNING).contains(
        `You're about to overwrite rule actions for ${expectedNumberOfRulesToBeEdited} selected rules`
      );

      submitBulkEditForm();
      waitForBulkEditActionToFinish({ rulesCount: expectedNumberOfRulesToBeEdited });

      // check if rule has been updated
      goToEditRuleActionsSettings();

      assertSelectedActionFrequency(expectedActionFrequency);
      assertSlackRuleAction(expectedSlackMessage);
    });

    it('Add rule actions to rules when creating connector', () => {
      const expectedActionFrequency = 'Hourly';
      const expectedEmail = 'test@example.com';
      const expectedSubject = 'Subject';

      selectNumberOfRules(expectedNumberOfCustomRulesToBeEdited);
      openBulkEditRuleActionsForm();

      pickActionFrequency(expectedActionFrequency);
      addEmailConnectorAndRuleAction(expectedEmail, expectedSubject);

      submitBulkEditForm();
      waitForBulkEditActionToFinish({ rulesCount: expectedNumberOfCustomRulesToBeEdited });

      // check if rule has been updated
      goToEditRuleActionsSettings();

      assertSelectedActionFrequency(expectedActionFrequency);
      assertEmailRuleAction(expectedEmail, expectedSubject);
    });
  });
});
