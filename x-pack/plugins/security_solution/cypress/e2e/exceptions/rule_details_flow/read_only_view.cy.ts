/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getExceptionList } from '../../../objects/exception';
import { getNewRule } from '../../../objects/rule';
import { ROLES } from '../../../../common/test';
import { createCustomRule } from '../../../tasks/api_calls/rules';
import { esArchiverResetKibana } from '../../../tasks/es_archiver';
import { login, visitWithoutDateRange } from '../../../tasks/login';
import { goToExceptionsTab, goToAlertsTab } from '../../../tasks/rule_details';
import { goToRuleDetails } from '../../../tasks/alerts_detection_rules';
import { DETECTIONS_RULE_MANAGEMENT_URL } from '../../../urls/navigation';
import { deleteAlertsAndRules } from '../../../tasks/common';
import {
  NO_EXCEPTIONS_EXIST_PROMPT,
  EXCEPTION_ITEM_VIEWER_CONTAINER,
  ADD_EXCEPTIONS_BTN_FROM_VIEWER_HEADER,
  ADD_EXCEPTIONS_BTN_FROM_EMPTY_PROMPT_BTN,
} from '../../../screens/exceptions';
import { EXCEPTION_ITEM_ACTIONS_BUTTON } from '../../../screens/rule_details';
import {
  createExceptionList,
  createExceptionListItem,
  deleteExceptionList,
} from '../../../tasks/api_calls/exceptions';

describe('Exceptions viewer read only', () => {
  const exceptionList = getExceptionList();

  before(() => {
    esArchiverResetKibana();
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
    });

    login(ROLES.reader);
  });

  beforeEach(() => {
    visitWithoutDateRange(DETECTIONS_RULE_MANAGEMENT_URL, ROLES.reader);
    goToRuleDetails();
    goToExceptionsTab();
  });

  after(() => {
    deleteAlertsAndRules();
    deleteExceptionList(exceptionList.list_id, exceptionList.namespace_type);
  });

  it('Cannot add an exception from empty viewer screen', () => {
    // when no exceptions exist, empty component shows with action to add exception
    cy.get(NO_EXCEPTIONS_EXIST_PROMPT).should('exist');

    // cannot add an exception from empty view
    cy.get(ADD_EXCEPTIONS_BTN_FROM_EMPTY_PROMPT_BTN).should('have.attr', 'disabled');
  });

  it('Cannot take actions on exception', () => {
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

    goToAlertsTab();
    goToExceptionsTab();

    // can view exceptions
    cy.get(NO_EXCEPTIONS_EXIST_PROMPT).should('not.exist');
    cy.get(EXCEPTION_ITEM_VIEWER_CONTAINER).should('have.length', 1);

    // cannot access edit/delete actions of item
    cy.get(EXCEPTION_ITEM_ACTIONS_BUTTON).should('have.attr', 'disabled');

    // does not display add exception button
    cy.get(ADD_EXCEPTIONS_BTN_FROM_VIEWER_HEADER).should('not.exist');
  });
});
