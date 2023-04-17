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
import { editException, editExceptionFlyoutItemName } from '../../../tasks/exceptions';
import { EXCEPTIONS_URL } from '../../../urls/navigation';

import {
  CONFIRM_BTN,
  MANAGE_EXCEPTION_CREATE_BUTTON_MENU,
  MANAGE_EXCEPTION_CREATE_BUTTON_EXCEPTION,
  RULE_ACTION_LINK_RULE_SWITCH,
} from '../../../screens/exceptions';

describe('Add/edit exception from exception management page', () => {
  before(() => {
    esArchiverResetKibana();
    esArchiverLoad('exceptions');
    login();
    visitWithoutDateRange(EXCEPTIONS_URL);
    createRule(getNewRule());
  });

  after(() => {
    esArchiverUnload('exceptions');
  });

  afterEach(() => {
    deleteCustomRule();
  });

  describe('create exception item', () => {
    it('create exception item', () => {
      const FIELD_DIFFERENT_FROM_EXISTING_ITEM_FIELD = 'agent.name';
      cy.get(MANAGE_EXCEPTION_CREATE_BUTTON_MENU).click();
      cy.get(MANAGE_EXCEPTION_CREATE_BUTTON_EXCEPTION).click();

      // edit exception item name
      editExceptionFlyoutItemName('Name');
      editException(FIELD_DIFFERENT_FROM_EXISTING_ITEM_FIELD, 0, 0);

      // should select some rules
      cy.get(CONFIRM_BTN).should('have.attr', 'disabled');

      // select rule
      cy.get(RULE_ACTION_LINK_RULE_SWITCH).find('button').click();

      // should be available to submit
      cy.get(CONFIRM_BTN).should('not.have.attr', 'disabled');
    });
  });
});
