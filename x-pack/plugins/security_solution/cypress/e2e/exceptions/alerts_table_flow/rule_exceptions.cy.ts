/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tag } from '../../../tags';

import { LOADING_INDICATOR } from '../../../screens/security_header';
import { getNewRule, getEndpointRule } from '../../../objects/rule';
import { ALERTS_COUNT, EMPTY_ALERT_TABLE } from '../../../screens/alerts';
import { createRule } from '../../../tasks/api_calls/rules';
import { goToRuleDetails } from '../../../tasks/alerts_detection_rules';
import {
  addExceptionFromFirstAlert,
  expandFirstAlert,
  goToClosedAlertsOnRuleDetailsPage,
  goToOpenedAlertsOnRuleDetailsPage,
  openAddRuleExceptionFromAlertActionButton,
} from '../../../tasks/alerts';
import {
  addExceptionEntryFieldValue,
  addExceptionEntryFieldValueValue,
  addExceptionEntryOperatorValue,
  addExceptionFlyoutItemName,
  selectBulkCloseAlerts,
  submitNewExceptionItem,
  validateExceptionItemFirstAffectedRuleNameInRulePage,
  validateExceptionItemAffectsTheCorrectRulesInRulePage,
  validateExceptionConditionField,
  validateExceptionCommentCountAndText,
  editExceptionFlyoutItemName,
  validateHighlightedFieldsPopulatedAsExceptionConditions,
  validateEmptyExceptionConditionField,
} from '../../../tasks/exceptions';
import { login, visitWithoutDateRange } from '../../../tasks/login';
import {
  goToAlertsTab,
  goToExceptionsTab,
  removeException,
  waitForTheRuleToBeExecuted,
} from '../../../tasks/rule_details';

import { DETECTIONS_RULE_MANAGEMENT_URL } from '../../../urls/navigation';
import { postDataView, deleteAlertsAndRules } from '../../../tasks/common';
import {
  ADD_AND_BTN,
  ENTRY_DELETE_BTN,
  EXCEPTION_CARD_ITEM_CONDITIONS,
  EXCEPTION_CARD_ITEM_NAME,
  EXCEPTION_ITEM_VIEWER_CONTAINER,
  NO_EXCEPTIONS_EXIST_PROMPT,
} from '../../../screens/exceptions';
import { waitForAlertsToPopulate } from '../../../tasks/create_new_rule';

const loadEndpointRuleAndAlerts = () => {
  cy.task('esArchiverLoad', 'endpoint');
  login();
  createRule(getEndpointRule());
  visitWithoutDateRange(DETECTIONS_RULE_MANAGEMENT_URL);
  goToRuleDetails();
  waitForAlertsToPopulate();
};

describe(
  'Rule Exceptions workflows from Alert',
  { tags: [tag.ESS, tag.BROKEN_IN_SERVERLESS] },
  () => {
    const EXPECTED_NUMBER_OF_ALERTS = '1 alert';
    const ITEM_NAME = 'Sample Exception Item';
    const ITEM_NAME_EDIT = 'Sample Exception Item Edit';
    const ADDITIONAL_ENTRY = 'host.hostname';
    const newRule = getNewRule();

    beforeEach(() => {
      cy.task('esArchiverResetKibana');
    });
    after(() => {
      cy.task('esArchiverUnload', 'exceptions');
      deleteAlertsAndRules();
    });
    afterEach(() => {
      cy.task('esArchiverUnload', 'exceptions_2');
    });

    it('Should create a Rule exception item from alert actions overflow menu and close all matching alerts', () => {
      cy.task('esArchiverLoad', 'exceptions');
      login();
      postDataView('exceptions-*');
      createRule({
        ...newRule,
        query: 'agent.name:*',
        data_view_id: 'exceptions-*',
        interval: '10s',
        rule_id: 'rule_testing',
      });
      visitWithoutDateRange(DETECTIONS_RULE_MANAGEMENT_URL);
      goToRuleDetails();
      waitForAlertsToPopulate();

      cy.get(LOADING_INDICATOR).should('not.exist');
      addExceptionFromFirstAlert();

      addExceptionEntryFieldValue('agent.name', 0);
      addExceptionEntryOperatorValue('is', 0);
      addExceptionEntryFieldValueValue('foo', 0);

      addExceptionFlyoutItemName(ITEM_NAME);
      selectBulkCloseAlerts();
      submitNewExceptionItem();

      // Alerts table should now be empty from having added exception and closed
      // matching alert
      cy.get(EMPTY_ALERT_TABLE).should('exist');

      // Closed alert should appear in table
      goToClosedAlertsOnRuleDetailsPage();
      cy.get(ALERTS_COUNT).should('exist');
      cy.get(ALERTS_COUNT).should('have.text', `${EXPECTED_NUMBER_OF_ALERTS}`);

      // Remove the exception and load an event that would have matched that exception
      // to show that said exception now starts to show up again
      goToExceptionsTab();

      // Validate the exception is affecting the correct rule count and name
      validateExceptionItemAffectsTheCorrectRulesInRulePage(1);
      validateExceptionItemFirstAffectedRuleNameInRulePage(newRule.name);

      // when removing exception and again, no more exist, empty screen shows again
      removeException();
      cy.get(NO_EXCEPTIONS_EXIST_PROMPT).should('exist');

      // load more docs
      cy.task('esArchiverLoad', 'exceptions_2');

      // now that there are no more exceptions, the docs should match and populate alerts
      goToAlertsTab();
      goToOpenedAlertsOnRuleDetailsPage();
      waitForTheRuleToBeExecuted();
      waitForAlertsToPopulate();

      cy.get(ALERTS_COUNT).should('have.text', '2 alerts');
    });
    it('Should create a Rule exception item from alert actions overflow menu and auto populate the conditions using alert Highlighted fields', () => {
      loadEndpointRuleAndAlerts();

      cy.get(LOADING_INDICATOR).should('not.exist');
      addExceptionFromFirstAlert();

      const highlightedFieldsBasedOnAlertDoc = [
        'host.name',
        'agent.id',
        'user.name',
        'process.executable',
        'file.path',
      ];

      /**
       * Validate the highlighted fields are auto populated, these
       * fields are based on the alert document that should be generated
       * when the endpoint rule runs
       */
      validateHighlightedFieldsPopulatedAsExceptionConditions(highlightedFieldsBasedOnAlertDoc);

      /**
       * Validate that the comments are opened by default with one comment added
       * showing a text contains information about the pre-filled conditions
       */
      validateExceptionCommentCountAndText(
        1,
        'Exception conditions are pre-filled with relevant data from an alert with the alert id (_id):'
      );

      addExceptionFlyoutItemName(ITEM_NAME);
      submitNewExceptionItem();
    });
    it('Should create a Rule exception from Alerts take action button and change multiple exception items without resetting to initial auto-prefilled entries', () => {
      loadEndpointRuleAndAlerts();

      cy.get(LOADING_INDICATOR).should('not.exist');

      // Open first Alert Summary
      expandFirstAlert();

      // The Rule exception should populated with highlighted fields
      openAddRuleExceptionFromAlertActionButton();

      const highlightedFieldsBasedOnAlertDoc = [
        'host.name',
        'agent.id',
        'user.name',
        'process.executable',
        'file.path',
      ];

      /**
       * Validate the highlighted fields are auto populated, these
       * fields are based on the alert document that should be generated
       * when the endpoint rule runs
       */
      validateHighlightedFieldsPopulatedAsExceptionConditions(highlightedFieldsBasedOnAlertDoc);

      /**
       * Validate that the comments are opened by default with one comment added
       * showing a text contains information about the pre-filled conditions
       */
      validateExceptionCommentCountAndText(
        1,
        'Exception conditions are pre-filled with relevant data from an alert with the alert id (_id):'
      );

      addExceptionFlyoutItemName(ITEM_NAME);

      cy.get(ADD_AND_BTN).click();

      // edit conditions
      addExceptionEntryFieldValue(ADDITIONAL_ENTRY, 5);
      addExceptionEntryFieldValueValue('foo', 5);

      // Change the name again
      editExceptionFlyoutItemName(ITEM_NAME_EDIT);

      // validate the condition is still 'host.hostname' or got rest after the name is changed
      validateExceptionConditionField(ADDITIONAL_ENTRY);

      submitNewExceptionItem();

      goToExceptionsTab();

      // new exception item displays
      cy.get(EXCEPTION_ITEM_VIEWER_CONTAINER).should('have.length', 1);
      cy.get(EXCEPTION_CARD_ITEM_NAME).should('have.text', ITEM_NAME_EDIT);
      cy.get(EXCEPTION_CARD_ITEM_CONDITIONS).contains('span', 'host.hostname');
    });
    it('Should delete all prefilled exception entries when creating a Rule exception from Alerts take action button without resetting to initial auto-prefilled entries', () => {
      loadEndpointRuleAndAlerts();

      cy.get(LOADING_INDICATOR).should('not.exist');

      // Open first Alert Summary
      expandFirstAlert();

      // The Rule exception should populated with highlighted fields
      openAddRuleExceptionFromAlertActionButton();

      const highlightedFieldsBasedOnAlertDoc = [
        'host.name',
        'agent.id',
        'user.name',
        'process.executable',
        'file.path',
      ];

      /**
       * Validate the highlighted fields are auto populated, these
       * fields are based on the alert document that should be generated
       * when the endpoint rule runs
       */
      validateHighlightedFieldsPopulatedAsExceptionConditions(highlightedFieldsBasedOnAlertDoc);

      /**
       * Delete all the highlighted fields to see if any condition
       * will prefuilled again.
       */
      const highlightedFieldsCount = highlightedFieldsBasedOnAlertDoc.length - 1;
      highlightedFieldsBasedOnAlertDoc.forEach((_, index) =>
        cy
          .get(ENTRY_DELETE_BTN)
          .eq(highlightedFieldsCount - index)
          .click()
      );

      /**
       * Validate that there are no highlighted fields are auto populated
       * after the deletion
       */
      validateEmptyExceptionConditionField();
    });
  }
);
