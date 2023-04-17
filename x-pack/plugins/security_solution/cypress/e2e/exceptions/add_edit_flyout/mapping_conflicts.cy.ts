/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getExceptionList } from '../../../objects/exception';
import { getNewRule } from '../../../objects/rule';

import { createRule, bulkAddIndexToRules } from '../../../tasks/api_calls/rules';
import { goToRuleDetails } from '../../../tasks/alerts_detection_rules';
import {
  esArchiverLoad,
  esArchiverUnload,
  esArchiverResetKibana,
} from '../../../tasks/es_archiver';
import { login, visitWithoutDateRange } from '../../../tasks/login';
import { goToExceptionsTab, openEditException } from '../../../tasks/rule_details';
import {
  addExceptionWildcardEntryValue,
  assertMatchesFlyoutItem,
  closeEditExceptionFlyout,
} from '../../../tasks/exceptions';
import { DETECTIONS_RULE_MANAGEMENT_URL } from '../../../urls/navigation';
import { deleteAlertsAndRules } from '../../../tasks/common';
import {
  EXCEPTION_CARD_ITEM_NAME,
  EXCEPTION_ITEM_NAME_INPUT,
  MAPPINGS_CONFLICT_WARNING,
} from '../../../screens/exceptions';
import { createExceptionList, createExceptionListItem } from '../../../tasks/api_calls/exceptions';

const EXCEPTION_ITEM_FIELD = 'elf.architecture';
const EXCEPTION_ITEM_OPERATOR = 'wildcard';
const EXCEPTION_ITEM_VALUE = 'boogy*';
const NEW_EXCEPTION_ITEM_VALUE = 'foobar*';
const getRule = () =>
  getNewRule({
    query: '*:*',
    index: ['exceptions*'],
    rule_id: '2',
  });

describe('Add/edit exception from rule details', () => {
  before(() => {
    esArchiverResetKibana();
    esArchiverLoad('exceptions');
    esArchiverLoad('auditbeat');
    login();
  });

  after(() => {
    esArchiverUnload('exceptions');
    esArchiverUnload('auditbeat');
  });

  describe('existing list and items', () => {
    const exceptionList = getExceptionList();
    before(() => {
      deleteAlertsAndRules();
      // create rule with exceptions
      createExceptionList(exceptionList, exceptionList.list_id).then((response) => {
        createRule({
          ...getRule(),
          exceptions_list: [
            {
              id: response.body.id,
              list_id: exceptionList.list_id,
              type: exceptionList.type,
              namespace_type: exceptionList.namespace_type,
            },
          ],
        });
        createExceptionListItem(exceptionList.list_id, {
          list_id: exceptionList.list_id,
          item_id: 'simple_list_item',
          tags: [],
          type: 'simple',
          description: 'Test exception item 2',
          name: 'Sample Exception List Item 2',
          namespace_type: 'single',
          entries: [
            {
              field: EXCEPTION_ITEM_FIELD,
              operator: 'included',
              type: EXCEPTION_ITEM_OPERATOR,
              value: EXCEPTION_ITEM_VALUE,
            },
          ],
        });
      });

      visitWithoutDateRange(DETECTIONS_RULE_MANAGEMENT_URL);
      goToRuleDetails();
      goToExceptionsTab();
    });

    it('Allows user to edit item when new field conflict exists', () => {
      // Check item loads as expected before conflicting mapping change
      cy.get(EXCEPTION_CARD_ITEM_NAME).should('have.text', 'Sample Exception List Item 2');

      openEditException(0);
      cy.get(EXCEPTION_ITEM_NAME_INPUT).should('exist');

      assertMatchesFlyoutItem(0, EXCEPTION_ITEM_FIELD, 'matches', EXCEPTION_ITEM_VALUE);
      closeEditExceptionFlyout();

      // Update rule to include an index that does not have the above exception item's field mapped
      bulkAddIndexToRules(['auditbeat*']);
      visitWithoutDateRange(DETECTIONS_RULE_MANAGEMENT_URL);
      goToRuleDetails();
      goToExceptionsTab();
      cy.get(EXCEPTION_CARD_ITEM_NAME).should('have.text', 'Sample Exception List Item 2');

      // Ensure on edit item still displays field, operator, and value
      openEditException(0);
      assertMatchesFlyoutItem(0, EXCEPTION_ITEM_FIELD, 'matches', EXCEPTION_ITEM_VALUE);
      cy.get(MAPPINGS_CONFLICT_WARNING).should('be.visible');

      // Update value and save
      addExceptionWildcardEntryValue(NEW_EXCEPTION_ITEM_VALUE, 0);
    });
  });
});
