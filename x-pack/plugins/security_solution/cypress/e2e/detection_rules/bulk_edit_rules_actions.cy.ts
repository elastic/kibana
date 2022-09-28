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

import {
  EMAIL_ACTION_BTN,
  CREATE_ACTION_CONNECTOR_BTN,
  SAVE_ACTION_CONNECTOR_BTN,
  EMAIL_ACTION_TO_INPUT,
  EMAIL_ACTION_SUBJECT_INPUT,
} from '../../screens/create_new_rule';

import { SLACK_ACTION_MESSAGE_TEXTAREA } from '../../screens/common/rule_actions';

import { fillEmailConnectorForm } from '../../tasks/create_new_rule';
import { addSlackRuleAction } from '../../tasks/common/rule_actions';
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
import { createConnector } from '../../tasks/api_calls/the_connectors';
import { cleanKibana, deleteAlertsAndRules } from '../../tasks/common';

import {
  getEqlRule,
  getNewThreatIndicatorRule,
  getNewRule,
  getNewThresholdRule,
  getMachineLearningRule,
  getNewTermsRule,
} from '../../objects/rule';

import { esArchiverResetKibana } from '../../tasks/es_archiver';

const RULE_NAME = 'Custom rule for bulk actions';

const expectedNumberOfCustomRulesToBeEdited = 7;
// 7 custom rules of different types + 3 prebuilt
const expectedNumberOfRulesToBeEdited = expectedNumberOfCustomRulesToBeEdited + 3;

const expectedSlackMessage = 'Slack action test message';

const defaultRuleData = {};

const createSlackConnector = () =>
  createConnector({
    actionTypeId: '.slack',
    secrets: {
      webhookUrl: 'http://localhost:123',
    },
    name: 'Slack connector',
  });

describe('Detection rules, bulk edit', () => {
  before(() => {
    cleanKibana();
    login();
  });
  beforeEach(() => {
    deleteAlertsAndRules();
    esArchiverResetKibana();
    createCustomRuleEnabled(
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
    createSavedQueryRule({ ...getNewRule(), ...defaultRuleData, savedId: 'mocked' }, '7');

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

      // ensure rule actions info callout is shown on the form
      cy.get(RULES_BULK_EDIT_ACTIONS_INFO).should('be.visible');

      pickActionFrequency(expectedActionFrequency);
      addSlackRuleAction(expectedSlackMessage);

      submitBulkEditForm();
      waitForBulkEditActionToFinish({ rulesCount: expectedNumberOfRulesToBeEdited });

      // check if rule has been updated
      goToEditRuleActionsSettings();

      assertSelectedActionFrequency(expectedActionFrequency);
      cy.get(SLACK_ACTION_MESSAGE_TEXTAREA).should('have.value', expectedSlackMessage);
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
      cy.get(SLACK_ACTION_MESSAGE_TEXTAREA).should('have.value', expectedSlackMessage);
    });

    it('Add rule actions to rules when creating connector', () => {
      const expectedActionFrequency = 'Hourly';
      const expectedEmail = 'test@example.com';
      const expectedSubject = 'Subject';

      selectNumberOfRules(expectedNumberOfCustomRulesToBeEdited);
      openBulkEditRuleActionsForm();

      pickActionFrequency(expectedActionFrequency);

      cy.get(EMAIL_ACTION_BTN).click();
      cy.get(CREATE_ACTION_CONNECTOR_BTN).click();
      fillEmailConnectorForm();
      cy.get(SAVE_ACTION_CONNECTOR_BTN).click();

      cy.get(EMAIL_ACTION_TO_INPUT).type(expectedEmail);
      cy.get(EMAIL_ACTION_SUBJECT_INPUT).type(expectedSubject);

      submitBulkEditForm();

      waitForBulkEditActionToFinish({ rulesCount: expectedNumberOfCustomRulesToBeEdited });

      // check if rule has been updated
      goToEditRuleActionsSettings();

      assertSelectedActionFrequency(expectedActionFrequency);

      cy.get(EMAIL_ACTION_TO_INPUT).contains(expectedEmail);
      cy.get(EMAIL_ACTION_SUBJECT_INPUT).should('have.value', expectedSubject);
    });
  });
});
