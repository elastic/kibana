/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getExceptionList } from '../../../objects/exception';
import { getNewRule } from '../../../objects/rule';

import { createCustomRuleEnabled } from '../../../tasks/api_calls/rules';
import { goToRuleDetails } from '../../../tasks/alerts_detection_rules';
import { goToOpenedAlerts } from '../../../tasks/alerts';
import {
  esArchiverLoad,
  esArchiverUnload,
  esArchiverResetKibana,
} from '../../../tasks/es_archiver';
import { login, visitWithoutDateRange } from '../../../tasks/login';
import {
  goToExceptionsTab,
  waitForTheRuleToBeExecuted,
  editException,
  goToAlertsTab,
} from '../../../tasks/rule_details';

import { DETECTIONS_RULE_MANAGEMENT_URL } from '../../../urls/navigation';
import { postDataView, deleteAlertsAndRules } from '../../../tasks/common';
import {
  EXCEPTION_EDIT_FLYOUT_SAVE_BTN,
  EXCEPTION_ITEM_VIEWER_CONTAINER,
  EXCEPTION_ITEM_CONTAINER,
  FIELD_INPUT,
} from '../../../screens/exceptions';
import {
  createExceptionList,
  createExceptionListItem,
  deleteExceptionList,
} from '../../../tasks/api_calls/exceptions';
import { waitForAlertsToPopulate } from '../../../tasks/create_new_rule';
import {
  addExceptionEntryFieldValueOfItemX,
  addExceptionEntryFieldValueValue,
} from '../../../tasks/exceptions';
import { ALERTS_COUNT, NUMBER_OF_ALERTS } from '../../../screens/alerts';

describe('Edit exception using data views from rule details', () => {
  const exceptionList = getExceptionList();
  const NUMBER_OF_AUDITBEAT_EXCEPTIONS_ALERTS = '1 alert';

  before(() => {
    esArchiverResetKibana();
    esArchiverLoad('exceptions');
    login();
    postDataView('exceptions-*');
  });

  after(() => {
    esArchiverUnload('exceptions');
  });

  beforeEach(() => {
    deleteAlertsAndRules();
    deleteExceptionList(exceptionList.list_id, exceptionList.namespace_type);
    // create rule with exceptions
    createExceptionList(exceptionList, exceptionList.list_id).then((response) => {
      createCustomRuleEnabled(
        {
          ...getNewRule(),
          customQuery: 'agent.name:*',
          dataSource: { dataView: 'exceptions-*', type: 'dataView' },
          exceptionLists: [
            {
              id: response.body.id,
              list_id: exceptionList.list_id,
              type: exceptionList.type,
              namespace_type: exceptionList.namespace_type,
            },
          ],
        },
        '2',
        '2s'
      );
      createExceptionListItem(exceptionList.list_id, {
        list_id: exceptionList.list_id,
        item_id: 'simple_list_item',
        tags: [],
        type: 'simple',
        description: 'Test exception item',
        name: 'Sample Exception List Item',
        namespace_type: 'single',
        entries: [
          {
            field: 'unique_value.test',
            operator: 'included',
            type: 'match_any',
            value: ['bar'],
          },
        ],
      });
    });

    visitWithoutDateRange(DETECTIONS_RULE_MANAGEMENT_URL);
    goToRuleDetails();
    waitForTheRuleToBeExecuted();
    waitForAlertsToPopulate();
    goToExceptionsTab();
  });

  afterEach(() => {
    esArchiverUnload('exceptions_2');
  });

  it('Edits an exception item', () => {
    // displays existing exception item
    cy.get(EXCEPTION_ITEM_VIEWER_CONTAINER).should('have.length', 1);

    editException();

    // check that the existing item's field is being populated
    cy.get(EXCEPTION_ITEM_CONTAINER)
      .eq(0)
      .find(FIELD_INPUT)
      .eq(0)
      .should('have.text', 'unique_value.test');

    // check that you can select a different field
    addExceptionEntryFieldValueOfItemX('agent.name{downarrow}{enter}', 0, 0);
    addExceptionEntryFieldValueValue('foo', 0);

    cy.get(EXCEPTION_EDIT_FLYOUT_SAVE_BTN).click();
    cy.get(EXCEPTION_EDIT_FLYOUT_SAVE_BTN).should('have.attr', 'disabled');
    cy.get(EXCEPTION_EDIT_FLYOUT_SAVE_BTN).should('not.exist');
    cy.get(EXCEPTION_ITEM_VIEWER_CONTAINER).should('have.length', 1);

    // Alerts table should still show single alert
    goToAlertsTab();
    cy.get(ALERTS_COUNT).should('exist');
    cy.get(NUMBER_OF_ALERTS).should('have.text', `${NUMBER_OF_AUDITBEAT_EXCEPTIONS_ALERTS}`);

    // load more docs
    esArchiverLoad('exceptions_2');

    // now that 2 more docs have been added, one should match the edited exception
    goToAlertsTab();
    goToOpenedAlerts();
    waitForTheRuleToBeExecuted();
    waitForAlertsToPopulate(2);

    // there should be 2 alerts, one is the original alert and the second is for the newly
    // matching doc
    cy.get(ALERTS_COUNT).should('exist');
    cy.get(NUMBER_OF_ALERTS).should('have.text', '2 alerts');
  });
});
