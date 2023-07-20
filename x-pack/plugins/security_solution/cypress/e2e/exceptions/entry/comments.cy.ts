/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ExceptionListTypeEnum, NamespaceType } from '@kbn/securitysolution-io-ts-list-types';
import { getException, getExceptionList } from '../../../objects/exception';
import { getNewRule } from '../../../objects/rule';

import { createRule } from '../../../tasks/api_calls/rules';
import { goToRuleDetails } from '../../../tasks/alerts_detection_rules';

import { login, visitWithoutDateRange } from '../../../tasks/login';
import {
  addExceptionFlyoutFromViewerHeader,
  goToEndpointExceptionsTab,
  goToExceptionsTab,
  openEditException,
  openExceptionFlyoutFromEmptyViewerPrompt,
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
import {
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

interface ResponseType {
  body: {
    id: string;
    list_id: string;
    type: ExceptionListTypeEnum;
    namespace_type: NamespaceType;
  };
}
describe('Add, copy comments in different exceptions type and validate sharing them between users', () => {
  describe('Rule exceptions', () => {
    beforeEach(() => {
      cy.task('esArchiverResetKibana');
      login();
      const exceptionList = getExceptionList();
      // create rule with exceptions
      createExceptionList(exceptionList, exceptionList.list_id).then((response) => {
        createRule({
          ...getNewRule(),
          query: '*',
          index: ['*'],
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
      visitWithoutDateRange(DETECTIONS_RULE_MANAGEMENT_URL);
      goToRuleDetails();
      goToExceptionsTab();
    });

    it('Add comment on a new exception, add another comment has unicode from a different user and copy to clipboard', () => {
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
      login(ROLES.soc_manager);

      // Navigate to Rule page
      visitWithoutDateRange(DETECTIONS_RULE_MANAGEMENT_URL);
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
    beforeEach(() => {
      cy.task('esArchiverResetKibana');
      login();
      // create rule with exception
      createEndpointExceptionList().then((response) => {
        createRule({
          ...getNewRule(),
          query: '*',
          index: ['*'],
          exceptions_list: [
            {
              id: (response as ResponseType).body.id,
              list_id: (response as ResponseType).body.list_id,
              type: (response as ResponseType).body.type,
              namespace_type: (response as ResponseType).body.namespace_type,
            },
          ],
          rule_id: '2',
        });
      });
      visitWithoutDateRange(DETECTIONS_RULE_MANAGEMENT_URL);
      goToRuleDetails();
      goToEndpointExceptionsTab();
    });

    it('Add comment on a new exception, and add another comment has unicode character from a different user', () => {
      // User 1
      // The Endpoint will populated with predefined fields

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
      login(ROLES.soc_manager);

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
    });
  });
});
