/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getException, getExceptionList } from '../../../objects/exception';
import { getNewRule } from '../../../objects/rule';

import { createRule } from '../../../tasks/api_calls/rules';
import { goToRuleDetails } from '../../../tasks/alerts_detection_rules';

import {
  esArchiverLoad,
  esArchiverUnload,
  esArchiverResetKibana,
} from '../../../tasks/es_archiver';
import { login, visitWithoutDateRange } from '../../../tasks/login';
import {
  addExceptionFlyoutFromViewerHeader,
  goToEndpointExceptionsTab,
  goToExceptionsTab,
  openEditException,
  openExceptionFlyoutFromEmptyViewerPrompt,
  removeException,
} from '../../../tasks/rule_details';
import {
  addExceptionComment,
  addExceptionConditions,
  addExceptionFlyoutItemName,
  clickCopyCommentToClipboard,
  submitEditedExceptionItem,
  submitNewExceptionItem,
  clickOnShowComments,
  selectOs,
} from '../../../tasks/exceptions';
import { DETECTIONS_RULE_MANAGEMENT_URL } from '../../../urls/navigation';
import { deleteAlertsAndRules } from '../../../tasks/common';
import {
  NO_EXCEPTIONS_EXIST_PROMPT,
  EXCEPTION_ITEM_VIEWER_CONTAINER,
  EXCEPTION_ITEM_COMMENTS_CONTAINER_TEXT,
  LOADING_SPINNER,
} from '../../../screens/exceptions';
import {
  createEndpointExceptionList,
  createExceptionList,
  createExceptionListItem,
} from '../../../tasks/api_calls/exceptions';
import { ROLES } from '../../../../common/test';

describe('Add, copy comments in different exceptions type and validate sharing them between users', () => {
  describe('Rule exceptions', () => {
    before(() => {
      esArchiverResetKibana();
      esArchiverLoad('exceptions');
      login();
      deleteAlertsAndRules();
      const exceptionList = getExceptionList();
      // create rule with exceptions
      createExceptionList(exceptionList, exceptionList.list_id).then((response) => {
        createRule({
          ...getNewRule(),
          query: 'agent.name:*',
          index: ['exceptions*'],
          exceptions_list: [
            {
              id: response.body.id,
              list_id: exceptionList.list_id,
              type: exceptionList.type,
              namespace_type: exceptionList.namespace_type,
            },
          ],
          rule_id: '2',
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
              field: 'unique_value.test',
              operator: 'included',
              type: 'match_any',
              value: ['foo'],
            },
          ],
        });
      });
    });
    beforeEach(() => {
      visitWithoutDateRange(DETECTIONS_RULE_MANAGEMENT_URL);
      goToRuleDetails();
      goToExceptionsTab();
    });

    after(() => {
      esArchiverUnload('exceptions');
    });

    it('Add comment on a new exception, add another comment has unicode from a different user and copy to clipboard', () => {
      cy.get(NO_EXCEPTIONS_EXIST_PROMPT).should('not.exist');

      // User 1
      // open add exception modal
      addExceptionFlyoutFromViewerHeader();

      cy.get(LOADING_SPINNER).should('not.exist');

      // add exception item conditions
      addExceptionConditions(getException());

      // add exception item name
      addExceptionFlyoutItemName('My item name');

      // add exception comment
      addExceptionComment('User 1 comment');

      // submit
      submitNewExceptionItem();

      // new exception item displays
      cy.get(EXCEPTION_ITEM_VIEWER_CONTAINER).should('have.length', 2);

      // click on show comments
      clickOnShowComments();
      // copy the first comment to clipboard
      clickCopyCommentToClipboard();

      cy.get(EXCEPTION_ITEM_COMMENTS_CONTAINER_TEXT).eq(0).should('have.text', 'User 1 comment');

      // User 2
      // Login with different users to validate accessing comments of different users
      login(ROLES.detections_admin);

      // Navigate to Rule page
      visitWithoutDateRange(DETECTIONS_RULE_MANAGEMENT_URL);
      goToRuleDetails();

      goToRuleDetails();
      goToExceptionsTab();

      // open edit exception modal
      openEditException();
      // add exception comment
      addExceptionComment('User 2 comment @ using unicode');
      // submit
      submitEditedExceptionItem();

      cy.get(EXCEPTION_ITEM_COMMENTS_CONTAINER_TEXT).eq(0).should('have.text', 'User 1 comment');

      cy.get(EXCEPTION_ITEM_COMMENTS_CONTAINER_TEXT)
        .eq(1)
        .should('have.text', 'User 2 comment @ using unicode');
    });
  });

  describe('Endpoint exceptions', () => {
    before(() => {
      esArchiverResetKibana();
      esArchiverLoad('auditbeat');
      login();
      deleteAlertsAndRules();
      // create rule with exception
      createEndpointExceptionList().then((response) => {
        createRule({
          ...getNewRule(),
          query: 'event.code:*',
          index: ['auditbeat*'],
          exceptions_list: [
            {
              id: response.body.id,
              list_id: response.body.list_id,
              type: response.body.type,
              namespace_type: response.body.namespace_type,
            },
          ],
          rule_id: '2',
        });
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

    it('Add comment on a new exception, and add another comment has unicode character from a different user', () => {
      // User 1
      // The Endpoint will populated with predefined fields
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
      // add exception comment
      addExceptionComment('User 1 comment');

      // add exception item name
      addExceptionFlyoutItemName('Endpoint exception');

      // submit
      submitNewExceptionItem();

      // Endpoint Exception will move to Endpoint List under Exception tab of rule
      goToEndpointExceptionsTab();

      // click on show comments
      clickOnShowComments();

      cy.get(EXCEPTION_ITEM_COMMENTS_CONTAINER_TEXT).eq(0).should('have.text', 'User 1 comment');

      // User 2
      // Login with different users to validate accessing comments of different users
      login(ROLES.detections_admin);

      // Navigate to Rule page
      visitWithoutDateRange(DETECTIONS_RULE_MANAGEMENT_URL);
      goToRuleDetails();

      // Endpoint Exception will move to Endpoint List under Exception tab of rule
      goToEndpointExceptionsTab();

      // open edit exception modal
      openEditException();
      // add exception comment
      addExceptionComment('User 2 comment @ using unicode');
      // submit
      submitEditedExceptionItem();

      cy.get(EXCEPTION_ITEM_COMMENTS_CONTAINER_TEXT).eq(0).should('have.text', 'User 1 comment');

      cy.get(EXCEPTION_ITEM_COMMENTS_CONTAINER_TEXT)
        .eq(1)
        .should('have.text', 'User 2 comment @ using unicode');
      removeException();
    });
  });
});
