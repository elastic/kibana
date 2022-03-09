/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getNewRule } from '../../objects/rule';

import { RULE_STATUS } from '../../screens/create_new_rule';

import { createCustomRule } from '../../tasks/api_calls/rules';
import { goToRuleDetails } from '../../tasks/alerts_detection_rules';
import { esArchiverLoad, esArchiverUnload } from '../../tasks/es_archiver';
import { loginAndWaitForPageWithoutDateRange } from '../../tasks/login';
import { openExceptionFlyoutFromRuleSettings, goToExceptionsTab } from '../../tasks/rule_details';
import {
  addExceptionEntryFieldValue,
  addExceptionEntryFieldValueOfItemX,
  closeExceptionBuilderFlyout,
} from '../../tasks/exceptions';
import {
  ADD_AND_BTN,
  ADD_OR_BTN,
  ADD_NESTED_BTN,
  ENTRY_DELETE_BTN,
  FIELD_INPUT,
  LOADING_SPINNER,
  EXCEPTION_ITEM_CONTAINER,
  ADD_EXCEPTIONS_BTN,
  EXCEPTION_FIELD_LIST,
  EDIT_EXCEPTIONS_BTN,
  EXCEPTION_EDIT_FLYOUT_SAVE_BTN,
  EXCEPTION_FLYOUT_VERSION_CONFLICT,
  EXCEPTION_FLYOUT_LIST_DELETED_ERROR,
} from '../../screens/exceptions';

import { DETECTIONS_RULE_MANAGEMENT_URL } from '../../urls/navigation';
import { cleanKibana, reload } from '../../tasks/common';
import {
  createExceptionList,
  createExceptionListItem,
  updateExceptionListItem,
  deleteExceptionList,
} from '../../tasks/api_calls/exceptions';
import { getExceptionList } from '../../objects/exception';

// NOTE: You might look at these tests and feel they're overkill,
// but the exceptions flyout has a lot of logic making it difficult
// to test in enzyme and very small changes can inadvertently add
// bugs. As the complexity within the builder grows, these should
// ensure the most basic logic holds.
describe('Exceptions flyout', () => {
  before(() => {
    cleanKibana();
    // this is a made-up index that has just the necessary
    // mappings to conduct tests, avoiding loading large
    // amounts of data like in auditbeat_exceptions
    esArchiverLoad('exceptions');
    loginAndWaitForPageWithoutDateRange(DETECTIONS_RULE_MANAGEMENT_URL);
    createExceptionList(getExceptionList(), getExceptionList().list_id).then((response) =>
      createCustomRule({
        ...getNewRule(),
        index: ['exceptions-*'],
        exceptionLists: [
          {
            id: response.body.id,
            list_id: getExceptionList().list_id,
            type: getExceptionList().type,
            namespace_type: getExceptionList().namespace_type,
          },
        ],
      })
    );
    reload();
    goToRuleDetails();
    cy.get(RULE_STATUS).should('have.text', '—');
    goToExceptionsTab();
  });

  after(() => {
    esArchiverUnload('exceptions');
  });

  it('Does not overwrite values and-ed together', () => {
    cy.root()
      .pipe(($el) => {
        $el.find(ADD_EXCEPTIONS_BTN).trigger('click');
        return $el.find(ADD_AND_BTN);
      })
      .should('be.visible');

    // add multiple entries with invalid field values
    addExceptionEntryFieldValue('agent.name', 0);
    cy.get(ADD_AND_BTN).click();
    addExceptionEntryFieldValue('@timestamp', 1);
    cy.get(ADD_AND_BTN).click();
    addExceptionEntryFieldValue('c', 2);

    // delete second item, invalid values 'a' and 'c' should remain
    cy.get(ENTRY_DELETE_BTN).eq(1).click();
    cy.get(FIELD_INPUT).eq(0).should('have.text', 'agent.name');
    cy.get(FIELD_INPUT).eq(1).should('have.text', 'c');

    closeExceptionBuilderFlyout();
  });

  it('Does not overwrite values or-ed together', () => {
    cy.root()
      .pipe(($el) => {
        $el.find(ADD_EXCEPTIONS_BTN).trigger('click');
        return $el.find(ADD_AND_BTN);
      })
      .should('be.visible');
    // exception item 1
    addExceptionEntryFieldValueOfItemX('agent.name', 0, 0);
    cy.get(ADD_AND_BTN).click();
    addExceptionEntryFieldValueOfItemX('user.id.keyword', 0, 1);

    // exception item 2
    cy.get(ADD_OR_BTN).click();
    addExceptionEntryFieldValueOfItemX('user.first', 1, 0);
    cy.get(ADD_AND_BTN).click();
    addExceptionEntryFieldValueOfItemX('user.last', 1, 1);
    cy.get(ADD_AND_BTN).click();
    addExceptionEntryFieldValueOfItemX('e', 1, 2);

    // delete single entry from exception item 2
    cy.get(ENTRY_DELETE_BTN).eq(3).click();
    cy.get(EXCEPTION_ITEM_CONTAINER)
      .eq(0)
      .find(FIELD_INPUT)
      .eq(0)
      .should('have.text', 'agent.name');
    cy.get(EXCEPTION_ITEM_CONTAINER)
      .eq(0)
      .find(FIELD_INPUT)
      .eq(1)
      .should('have.text', 'user.id.keyword');
    cy.get(EXCEPTION_ITEM_CONTAINER)
      .eq(1)
      .find(FIELD_INPUT)
      .eq(0)
      .should('have.text', 'user.first');
    cy.get(EXCEPTION_ITEM_CONTAINER).eq(1).find(FIELD_INPUT).eq(1).should('have.text', 'e');

    // delete remaining entries in exception item 2
    cy.get(ENTRY_DELETE_BTN).eq(2).click();
    cy.get(ENTRY_DELETE_BTN).eq(2).click();
    cy.get(EXCEPTION_ITEM_CONTAINER)
      .eq(0)
      .find(FIELD_INPUT)
      .eq(0)
      .should('have.text', 'agent.name');
    cy.get(EXCEPTION_ITEM_CONTAINER)
      .eq(0)
      .find(FIELD_INPUT)
      .eq(1)
      .should('have.text', 'user.id.keyword');
    cy.get(EXCEPTION_ITEM_CONTAINER).eq(1).should('not.exist');

    closeExceptionBuilderFlyout();
  });

  it('Does not overwrite values of nested entry items', () => {
    openExceptionFlyoutFromRuleSettings();
    cy.get(LOADING_SPINNER).should('not.exist');

    // exception item 1
    addExceptionEntryFieldValueOfItemX('agent.name', 0, 0);
    cy.get(ADD_AND_BTN).click();
    addExceptionEntryFieldValueOfItemX('b', 0, 1);

    // exception item 2 with nested field
    cy.get(ADD_OR_BTN).click();
    addExceptionEntryFieldValueOfItemX('agent.name', 1, 0);
    cy.get(ADD_NESTED_BTN).click();
    addExceptionEntryFieldValueOfItemX('user.id{downarrow}{enter}', 1, 1);
    cy.get(ADD_AND_BTN).click();
    addExceptionEntryFieldValueOfItemX('last{downarrow}{enter}', 1, 3);
    // This button will now read `Add non-nested button`
    cy.get(ADD_NESTED_BTN).scrollIntoView();
    cy.get(ADD_NESTED_BTN).focus().click();
    addExceptionEntryFieldValueOfItemX('@timestamp', 1, 4);

    // should have only deleted `user.id`
    cy.get(ENTRY_DELETE_BTN).eq(4).click();
    cy.get(EXCEPTION_ITEM_CONTAINER)
      .eq(0)
      .find(FIELD_INPUT)
      .eq(0)
      .should('have.text', 'agent.name');
    cy.get(EXCEPTION_ITEM_CONTAINER).eq(0).find(FIELD_INPUT).eq(1).should('have.text', 'b');
    cy.get(EXCEPTION_ITEM_CONTAINER)
      .eq(1)
      .find(FIELD_INPUT)
      .eq(0)
      .should('have.text', 'agent.name');
    cy.get(EXCEPTION_ITEM_CONTAINER).eq(1).find(FIELD_INPUT).eq(1).should('have.text', 'user');
    cy.get(EXCEPTION_ITEM_CONTAINER).eq(1).find(FIELD_INPUT).eq(2).should('have.text', 'last');
    cy.get(EXCEPTION_ITEM_CONTAINER)
      .eq(1)
      .find(FIELD_INPUT)
      .eq(3)
      .should('have.text', '@timestamp');

    // deleting the last value of a nested entry, should delete the child and parent
    cy.get(ENTRY_DELETE_BTN).eq(4).click();
    cy.get(EXCEPTION_ITEM_CONTAINER)
      .eq(0)
      .find(FIELD_INPUT)
      .eq(0)
      .should('have.text', 'agent.name');
    cy.get(EXCEPTION_ITEM_CONTAINER).eq(0).find(FIELD_INPUT).eq(1).should('have.text', 'b');
    cy.get(EXCEPTION_ITEM_CONTAINER)
      .eq(1)
      .find(FIELD_INPUT)
      .eq(0)
      .should('have.text', 'agent.name');
    cy.get(EXCEPTION_ITEM_CONTAINER)
      .eq(1)
      .find(FIELD_INPUT)
      .eq(1)
      .should('have.text', '@timestamp');

    closeExceptionBuilderFlyout();
  });

  it('Contains custom index fields', () => {
    cy.root()
      .pipe(($el) => {
        $el.find(ADD_EXCEPTIONS_BTN).trigger('click');
        return $el.find(ADD_AND_BTN);
      })
      .should('be.visible');
    cy.get(FIELD_INPUT).eq(0).click({ force: true });
    cy.get(EXCEPTION_FIELD_LIST).contains('unique_value.test');

    closeExceptionBuilderFlyout();
  });

  describe('flyout errors', () => {
    before(() => {
      // create exception item via api
      createExceptionListItem(getExceptionList().list_id, {
        list_id: getExceptionList().list_id,
        item_id: 'simple_list_item',
        tags: [],
        type: 'simple',
        description: 'Test exception item',
        name: 'Sample Exception List Item',
        namespace_type: 'single',
        entries: [
          {
            field: 'host.name',
            operator: 'included',
            type: 'match_any',
            value: ['some host', 'another host'],
          },
        ],
      });

      reload();
      cy.get(RULE_STATUS).should('have.text', '—');
      goToExceptionsTab();
    });

    context('When updating an item with version conflict', () => {
      it('Displays version conflict error', () => {
        cy.get(EDIT_EXCEPTIONS_BTN).should('be.visible');
        cy.get(EDIT_EXCEPTIONS_BTN).click({ force: true });

        // update exception item via api
        updateExceptionListItem('simple_list_item', {
          name: 'Updated item name',
          item_id: 'simple_list_item',
          tags: [],
          type: 'simple',
          description: 'Test exception item',
          namespace_type: 'single',
          entries: [
            {
              field: 'host.name',
              operator: 'included',
              type: 'match_any',
              value: ['some host', 'another host'],
            },
          ],
        });

        // try to save and see version conflict error
        cy.get(EXCEPTION_EDIT_FLYOUT_SAVE_BTN).click({ force: true });

        cy.get(EXCEPTION_FLYOUT_VERSION_CONFLICT).should('be.visible');

        closeExceptionBuilderFlyout();
      });
    });

    context('When updating an item for a list that has since been deleted', () => {
      it('Displays missing exception list error', () => {
        cy.get(EDIT_EXCEPTIONS_BTN).should('be.visible');
        cy.get(EDIT_EXCEPTIONS_BTN).click({ force: true });

        // delete exception list via api
        deleteExceptionList(getExceptionList().list_id, getExceptionList().namespace_type);

        // try to save and see error
        cy.get(EXCEPTION_EDIT_FLYOUT_SAVE_BTN).click({ force: true });

        cy.get(EXCEPTION_FLYOUT_LIST_DELETED_ERROR).should('be.visible');
      });
    });
  });
});
