/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getException, getExceptionList } from '../../../objects/exception';
import { getNewRule } from '../../../objects/rule';

import { ALERTS_COUNT, EMPTY_ALERT_TABLE, NUMBER_OF_ALERTS } from '../../../screens/alerts';
import { createCustomRule, createCustomRuleEnabled } from '../../../tasks/api_calls/rules';
import { goToRuleDetails } from '../../../tasks/alerts_detection_rules';
import { goToClosedAlerts, goToOpenedAlerts } from '../../../tasks/alerts';
import {
  esArchiverLoad,
  esArchiverUnload,
  esArchiverResetKibana,
} from '../../../tasks/es_archiver';
import { login, visitWithoutDateRange } from '../../../tasks/login';
import {
  addExceptionFromRuleDetails,
  addFirstExceptionFromRuleDetails,
  goToAlertsTab,
  goToExceptionsTab,
  removeException,
  searchForExceptionItem,
  waitForTheRuleToBeExecuted,
} from '../../../tasks/rule_details';

import { DETECTIONS_RULE_MANAGEMENT_URL } from '../../../urls/navigation';
import { deleteAlertsAndRules } from '../../../tasks/common';
import {
  NO_EXCEPTIONS_EXIST_PROMPT,
  EXCEPTION_ITEM_VIEWER_CONTAINER,
  NO_EXCEPTIONS_SEARCH_RESULTS_PROMPT,
} from '../../../screens/exceptions';
import {
  createExceptionList,
  createExceptionListItem,
  deleteExceptionList,
} from '../../../tasks/api_calls/exceptions';
import { waitForAlertsToPopulate } from '../../../tasks/create_new_rule';

describe('Add exception from rule details', () => {
  const NUMBER_OF_AUDITBEAT_EXCEPTIONS_ALERTS = '1 alert';

  before(() => {
    esArchiverResetKibana();
    esArchiverLoad('exceptions');
    login();
  });

  after(() => {
    esArchiverUnload('exceptions');
  });

  describe('rule with existing exceptions', () => {
    const exceptionList = getExceptionList();
    beforeEach(() => {
      deleteAlertsAndRules();
      deleteExceptionList(exceptionList.list_id, exceptionList.namespace_type);
      // create rule with exceptions
      createExceptionList(exceptionList, exceptionList.list_id).then((response) => {
        createCustomRule(
          {
            ...getNewRule(),
            customQuery: 'agent.name:*',
            dataSource: { index: ['exceptions*'], type: 'indexPatterns' },
            exceptionLists: [
              {
                id: response.body.id,
                list_id: exceptionList.list_id,
                type: exceptionList.type,
                namespace_type: exceptionList.namespace_type,
              },
            ],
          },
          '2'
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
              field: 'user.name',
              operator: 'included',
              type: 'match_any',
              value: ['bar'],
            },
          ],
        });
        createExceptionListItem(exceptionList.list_id, {
          list_id: exceptionList.list_id,
          item_id: 'simple_list_item_2',
          tags: [],
          type: 'simple',
          description: 'Test exception item 2',
          name: 'Sample Exception List Item 2',
          namespace_type: 'single',
          entries: [
            {
              field: 'unique_value.test',
              operator: 'included',
              type: 'match_any',
              value: ['foo'],
            },
          ],
        });
      });

      visitWithoutDateRange(DETECTIONS_RULE_MANAGEMENT_URL);
      goToRuleDetails();
      goToExceptionsTab();
    });

    it('Creates an exception item', () => {
      // displays existing exception items
      cy.get(NO_EXCEPTIONS_EXIST_PROMPT).should('not.exist');
      cy.get(EXCEPTION_ITEM_VIEWER_CONTAINER).should('have.length', 2);

      // clicks prompt button to add a new exception item
      addExceptionFromRuleDetails(getException());

      // new exception item displays
      cy.get(EXCEPTION_ITEM_VIEWER_CONTAINER).should('have.length', 3);
    });

    // Trying to figure out with EUI why the search won't trigger
    it.skip('Can search for items', () => {
      // displays existing exception items
      cy.get(NO_EXCEPTIONS_EXIST_PROMPT).should('not.exist');
      cy.get(EXCEPTION_ITEM_VIEWER_CONTAINER).should('have.length', 2);

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

  describe('rule without existing exceptions', () => {
    beforeEach(() => {
      deleteAlertsAndRules();
      createCustomRuleEnabled(
        {
          ...getNewRule(),
          customQuery: 'agent.name:*',
          dataSource: { index: ['exceptions*'], type: 'indexPatterns' },
        },
        'rule_testing',
        '1s'
      );
      visitWithoutDateRange(DETECTIONS_RULE_MANAGEMENT_URL);
      goToRuleDetails();
      goToExceptionsTab();
    });

    afterEach(() => {
      esArchiverUnload('exceptions_2');
    });

    it('Creates an exception item when none exist', () => {
      // when no exceptions exist, empty component shows with action to add exception
      cy.get(NO_EXCEPTIONS_EXIST_PROMPT).should('exist');

      // clicks prompt button to add first exception that will also select to close
      // all matching alerts
      addFirstExceptionFromRuleDetails({
        field: 'agent.name',
        operator: 'is',
        values: ['foo'],
      });

      // new exception item displays
      cy.get(EXCEPTION_ITEM_VIEWER_CONTAINER).should('have.length', 1);

      // Alerts table should now be empty from having added exception and closed
      // matching alert
      goToAlertsTab();
      cy.get(EMPTY_ALERT_TABLE).should('exist');

      // Closed alert should appear in table
      goToClosedAlerts();
      cy.get(ALERTS_COUNT).should('exist');
      cy.get(NUMBER_OF_ALERTS).should('have.text', `${NUMBER_OF_AUDITBEAT_EXCEPTIONS_ALERTS}`);

      // Remove the exception and load an event that would have matched that exception
      // to show that said exception now starts to show up again
      goToExceptionsTab();

      // when removing exception and again, no more exist, empty screen shows again
      removeException();
      cy.get(NO_EXCEPTIONS_EXIST_PROMPT).should('exist');

      // load more docs
      esArchiverLoad('exceptions_2');

      // now that there are no more exceptions, the docs should match and populate alerts
      goToAlertsTab();
      goToOpenedAlerts();
      waitForTheRuleToBeExecuted();
      waitForAlertsToPopulate();

      cy.get(ALERTS_COUNT).should('exist');
      cy.get(NUMBER_OF_ALERTS).should('have.text', '2 alerts');
    });
  });
});
