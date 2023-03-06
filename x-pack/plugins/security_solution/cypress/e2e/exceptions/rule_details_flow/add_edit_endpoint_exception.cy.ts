/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getNewRule } from '../../../objects/rule';

import { createCustomRule } from '../../../tasks/api_calls/rules';
import { goToRuleDetails } from '../../../tasks/alerts_detection_rules';
import {
  esArchiverLoad,
  esArchiverResetKibana,
  esArchiverUnload,
} from '../../../tasks/es_archiver';
import { login, visitWithoutDateRange } from '../../../tasks/login';
import {
  goToEndpointExceptionsTab,
  openEditException,
  openExceptionFlyoutFromEmptyViewerPrompt,
  searchForExceptionItem,
} from '../../../tasks/rule_details';
import {
  addExceptionConditions,
  addExceptionFlyoutItemName,
  editException,
  editExceptionFlyoutItemName,
  selectOs,
  submitEditedExceptionItem,
  submitNewExceptionItem,
} from '../../../tasks/exceptions';

import { DETECTIONS_RULE_MANAGEMENT_URL } from '../../../urls/navigation';
import { deleteAlertsAndRules } from '../../../tasks/common';
import {
  NO_EXCEPTIONS_EXIST_PROMPT,
  EXCEPTION_ITEM_VIEWER_CONTAINER,
  NO_EXCEPTIONS_SEARCH_RESULTS_PROMPT,
  CLOSE_ALERTS_CHECKBOX,
  CONFIRM_BTN,
  ADD_TO_RULE_OR_LIST_SECTION,
  CLOSE_SINGLE_ALERT_CHECKBOX,
  EXCEPTION_ITEM_CONTAINER,
  VALUES_INPUT,
  EXCEPTION_CARD_ITEM_NAME,
  EXCEPTION_CARD_ITEM_CONDITIONS,
  FIELD_INPUT_PARENT,
} from '../../../screens/exceptions';
import { createEndpointExceptionList } from '../../../tasks/api_calls/exceptions';

describe('Add endpoint exception from rule details', () => {
  const ITEM_NAME = 'Sample Exception List Item';

  before(() => {
    esArchiverResetKibana();
    esArchiverLoad('auditbeat');
    login();
    deleteAlertsAndRules();
    // create rule with exception
    createEndpointExceptionList().then((response) => {
      createCustomRule(
        {
          ...getNewRule(),
          customQuery: 'event.code:*',
          dataSource: { index: ['auditbeat*'], type: 'indexPatterns' },
          exceptionLists: [
            {
              id: response.body.id,
              list_id: response.body.list_id,
              type: response.body.type,
              namespace_type: response.body.namespace_type,
            },
          ],
        },
        '2'
      );
    });
  });

  beforeEach(() => {
    visitWithoutDateRange(DETECTIONS_RULE_MANAGEMENT_URL);
    goToRuleDetails();
    goToEndpointExceptionsTab();
  });

  after(() => {
    esArchiverUnload('auditbeat');
  });

  it('creates an exception item', () => {
    // when no exceptions exist, empty component shows with action to add exception
    cy.get(NO_EXCEPTIONS_EXIST_PROMPT).should('exist');

    // open add exception modal
    openExceptionFlyoutFromEmptyViewerPrompt();

    // for endpoint exceptions, must specify OS
    selectOs('windows');

    // add exception item conditions
    addExceptionConditions({
      field: 'event.code',
      operator: 'is',
      values: ['foo'],
    });

    // Name is required so want to check that submit is still disabled
    cy.get(CONFIRM_BTN).should('have.attr', 'disabled');

    // add exception item name
    addExceptionFlyoutItemName(ITEM_NAME);

    // Option to add to rule or add to list should NOT appear
    cy.get(ADD_TO_RULE_OR_LIST_SECTION).should('not.exist');

    // not testing close alert functionality here, just ensuring that the options appear as expected
    cy.get(CLOSE_SINGLE_ALERT_CHECKBOX).should('not.exist');
    cy.get(CLOSE_ALERTS_CHECKBOX).should('exist');

    // submit
    submitNewExceptionItem();

    // new exception item displays
    cy.get(EXCEPTION_ITEM_VIEWER_CONTAINER).should('have.length', 1);
  });

  it('edits an endpoint exception item', () => {
    const NEW_ITEM_NAME = 'Exception item-EDITED';
    const ITEM_FIELD = 'event.code';
    const FIELD_DIFFERENT_FROM_EXISTING_ITEM_FIELD = 'agent.name';

    // displays existing exception items
    cy.get(EXCEPTION_ITEM_VIEWER_CONTAINER).should('have.length', 1);
    cy.get(NO_EXCEPTIONS_EXIST_PROMPT).should('not.exist');
    cy.get(EXCEPTION_CARD_ITEM_NAME).should('have.text', ITEM_NAME);
    cy.get(EXCEPTION_CARD_ITEM_CONDITIONS).should('have.text', ` ${ITEM_FIELD}IS foo`);

    // open edit exception modal
    openEditException();

    // edit exception item name
    editExceptionFlyoutItemName(NEW_ITEM_NAME);

    // check that the existing item's field is being populated
    cy.get(EXCEPTION_ITEM_CONTAINER)
      .eq(0)
      .find(FIELD_INPUT_PARENT)
      .eq(0)
      .should('have.text', ITEM_FIELD);
    cy.get(VALUES_INPUT).should('have.text', 'foo');

    // edit conditions
    editException(FIELD_DIFFERENT_FROM_EXISTING_ITEM_FIELD, 0, 0);

    // submit
    submitEditedExceptionItem();

    // new exception item displays
    cy.get(EXCEPTION_ITEM_VIEWER_CONTAINER).should('have.length', 1);

    // check that updates stuck
    cy.get(EXCEPTION_CARD_ITEM_NAME).should('have.text', NEW_ITEM_NAME);
    cy.get(EXCEPTION_CARD_ITEM_CONDITIONS).should('have.text', ' agent.nameIS foo');
  });

  it('allows user to search for items', () => {
    cy.get(EXCEPTION_ITEM_VIEWER_CONTAINER).should('have.length', 1);

    // can search for an exception value
    searchForExceptionItem('foo');

    // new exception item displays
    cy.get(EXCEPTION_ITEM_VIEWER_CONTAINER).should('have.length', 1);

    // displays empty search result view if no matches found
    searchForExceptionItem('abc');

    // new exception item displays
    cy.get(NO_EXCEPTIONS_SEARCH_RESULTS_PROMPT).should('exist');
  });
});
