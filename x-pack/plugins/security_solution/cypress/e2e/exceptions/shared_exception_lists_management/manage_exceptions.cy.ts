/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  esArchiverLoad,
  esArchiverUnload,
  esArchiverResetKibana,
} from '../../../tasks/es_archiver';
import { getNewRule } from '../../../objects/rule';
import { login, visitWithoutDateRange } from '../../../tasks/login';
import { createRule, deleteCustomRule } from '../../../tasks/api_calls/rules';
import {
  addExceptionFlyoutItemName,
  editException,
  editExceptionFlyoutItemName,
  submitEditedExceptionItem,
  submitNewExceptionItem,
} from '../../../tasks/exceptions';
import { DETECTIONS_RULE_MANAGEMENT_URL, EXCEPTIONS_URL } from '../../../urls/navigation';

import {
  CONFIRM_BTN,
  MANAGE_EXCEPTION_CREATE_BUTTON_MENU,
  MANAGE_EXCEPTION_CREATE_BUTTON_EXCEPTION,
  RULE_ACTION_LINK_RULE_SWITCH,
  EXCEPTION_ITEM_VIEWER_CONTAINER,
  EXCEPTION_CARD_ITEM_NAME,
  EXCEPTIONS_LIST_MANAGEMENT_NAME,
  LINK_TO_SHARED_LIST_RADIO,
  EXCEPTION_ITEM_HEADER_ACTION_MENU,
  EXCEPTION_ITEM_OVERFLOW_ACTION_EDIT,
  EXECPTION_ITEM_CARD_HEADER_TITLE,
  EXCEPTION_ITEM_OVERFLOW_ACTION_DELETE,
  EMPTY_EXCEPTIONS_VIEWER,
} from '../../../screens/exceptions';
import { goToRuleDetails } from '../../../tasks/alerts_detection_rules';
import { goToExceptionsTab } from '../../../tasks/rule_details';
import {
  createSharedExceptionList,
  findSharedExceptionListItemsByName,
  waitForExceptionsTableToBeLoaded,
} from '../../../tasks/exceptions_table';

describe('Add, edit and delete exception', () => {
  before(() => {
    esArchiverResetKibana();
    esArchiverLoad('exceptions');
    login();
    createRule(getNewRule());
  });

  beforeEach(() => {
    visitWithoutDateRange(EXCEPTIONS_URL);
    waitForExceptionsTableToBeLoaded();
  });
  after(() => {
    esArchiverUnload('exceptions');
  });

  afterEach(() => {
    deleteCustomRule();
  });

  const exceptionName = 'My item name';
  const exceptionNameEdited = 'My item name edited';
  const FIELD_DIFFERENT_FROM_EXISTING_ITEM_FIELD = 'agent.name';
  const EXCEPTION_LIST_NAME = 'Newly created list';

  describe('Add, Edit and delete Exception item', () => {
    it('should create exception item from Shared Exception List page and linked to a Rule', () => {
      // Click on "Create shared exception list" button on the header
      cy.get(MANAGE_EXCEPTION_CREATE_BUTTON_MENU).click();
      // Click on "Create exception item"
      cy.get(MANAGE_EXCEPTION_CREATE_BUTTON_EXCEPTION).click();

      // Add exception item name
      addExceptionFlyoutItemName(exceptionName);

      // Add Condition
      editException(FIELD_DIFFERENT_FROM_EXISTING_ITEM_FIELD, 0, 0);

      // Confirm button should disabled until a rule(s) is selected
      cy.get(CONFIRM_BTN).should('have.attr', 'disabled');

      // select rule
      cy.get(RULE_ACTION_LINK_RULE_SWITCH).find('button').click();

      // should  be able to submit
      cy.get(CONFIRM_BTN).should('not.have.attr', 'disabled');

      submitNewExceptionItem();

      // Navigate to Rule page
      visitWithoutDateRange(DETECTIONS_RULE_MANAGEMENT_URL);
      goToRuleDetails();

      goToExceptionsTab();

      // Only one Exception should generated
      cy.get(EXCEPTION_ITEM_VIEWER_CONTAINER).should('have.length', 1);

      // validate the And operator is displayed correctly
      cy.get(EXCEPTION_CARD_ITEM_NAME).should('have.text', exceptionName);
    });

    it('should create exception item from Shared Exception List page, linked to a Shared List and validate Edit/delete in list detail page', function () {
      createSharedExceptionList(
        { name: 'Newly created list', description: 'This is my list.' },
        true
      );

      // After creation - directed to list detail page
      cy.get(EXCEPTIONS_LIST_MANAGEMENT_NAME).should('have.text', EXCEPTION_LIST_NAME);

      // Go back to Shared Exception List
      visitWithoutDateRange(EXCEPTIONS_URL);

      // Click on "Create shared exception list" button on the header
      cy.get(MANAGE_EXCEPTION_CREATE_BUTTON_MENU).click();
      // Click on "Create exception item"
      cy.get(MANAGE_EXCEPTION_CREATE_BUTTON_EXCEPTION).click();

      // Add exception item name
      addExceptionFlyoutItemName(exceptionName);

      // Add Condition
      editException(FIELD_DIFFERENT_FROM_EXISTING_ITEM_FIELD, 0, 0);

      // select rule
      cy.get(LINK_TO_SHARED_LIST_RADIO).click();
      cy.get(RULE_ACTION_LINK_RULE_SWITCH).find('button').click();

      submitNewExceptionItem();

      // New exception is added to the new List
      findSharedExceptionListItemsByName(`${EXCEPTION_LIST_NAME}`, [exceptionName]);

      // Click on the first exception overflow menu items
      cy.get(EXCEPTION_ITEM_HEADER_ACTION_MENU).click();

      // Open the edit modal
      cy.get(EXCEPTION_ITEM_OVERFLOW_ACTION_EDIT).click();

      // edit exception item name
      editExceptionFlyoutItemName(exceptionNameEdited);

      // submit
      submitEditedExceptionItem();

      // check the new name after edit
      cy.get(EXECPTION_ITEM_CARD_HEADER_TITLE).should('have.text', exceptionNameEdited);

      // Click on the first exception overflow menu items
      cy.get(EXCEPTION_ITEM_HEADER_ACTION_MENU).click();

      // Delete exception
      cy.get(EXCEPTION_ITEM_OVERFLOW_ACTION_DELETE).click();

      cy.get(EMPTY_EXCEPTIONS_VIEWER).should('exist');
    });
  });
});
