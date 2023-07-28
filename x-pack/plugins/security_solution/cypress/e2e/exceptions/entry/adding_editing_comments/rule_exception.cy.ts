/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  createExceptionList,
  createExceptionListItem,
} from '../../../../tasks/api_calls/exceptions';
import { ROLES } from '../../../../../common/test';
import { getExceptionList, getException } from '../../../../objects/exception';
import { getNewRule } from '../../../../objects/rule';
import {
  LOADING_SPINNER,
  EXCEPTION_ITEM_VIEWER_CONTAINER,
  EXCEPTION_ITEM_COMMENTS_CONTAINER_TEXT,
} from '../../../../screens/exceptions';
import { goToRuleDetails } from '../../../../tasks/alerts_detection_rules';
import { createRule } from '../../../../tasks/api_calls/rules';
import {
  addExceptionConditions,
  addExceptionFlyoutItemName,
  addExceptionComment,
  submitNewExceptionItem,
  clickOnShowComments,
  clickCopyCommentToClipboard,
  submitEditedExceptionItem,
} from '../../../../tasks/exceptions';
import { login, visitWithoutDateRange } from '../../../../tasks/login';
import {
  goToExceptionsTab,
  addExceptionFlyoutFromViewerHeader,
  openEditException,
} from '../../../../tasks/rule_details';
import { DETECTIONS_RULE_MANAGEMENT_URL } from '../../../../urls/navigation';

Cypress._.times(50, () => {
  describe('Rule exceptions - Add, copy comments in different exceptions type and validate sharing them between users', () => {
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
});
