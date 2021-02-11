/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { newRule } from '../../objects/rule';

import { RULE_STATUS } from '../../screens/create_new_rule';

import { goToManageAlertsDetectionRules, waitForAlertsIndexToBeCreated } from '../../tasks/alerts';
import { createCustomRule } from '../../tasks/api_calls/rules';
import { goToRuleDetails } from '../../tasks/alerts_detection_rules';
import { esArchiverLoad, esArchiverUnload } from '../../tasks/es_archiver';
import { loginAndWaitForPageWithoutDateRange } from '../../tasks/login';
import { openExceptionModalFromRuleSettings, goToExceptionsTab } from '../../tasks/rule_details';
import { addExceptionEntryFieldValue, closeExceptionBuilderModal } from '../../tasks/exceptions';
import {
  ADD_AND_BTN,
  ADD_OR_BTN,
  ADD_NESTED_BTN,
  ENTRY_DELETE_BTN,
  FIELD_INPUT,
  LOADING_SPINNER,
} from '../../screens/exceptions';

import { DETECTIONS_URL } from '../../urls/navigation';
import { cleanKibana } from '../../tasks/common';

describe('Exceptions modal', () => {
  before(() => {
    cleanKibana();
    loginAndWaitForPageWithoutDateRange(DETECTIONS_URL);
    waitForAlertsIndexToBeCreated();
    createCustomRule(newRule);
    goToManageAlertsDetectionRules();
    goToRuleDetails();

    cy.get(RULE_STATUS).should('have.text', '—');

    esArchiverLoad('auditbeat_for_exceptions');

    goToExceptionsTab();
  });

  after(() => {
    esArchiverUnload('auditbeat_for_exceptions');
  });

  it('Does not overwrite invalid values and-ed together', () => {
    openExceptionModalFromRuleSettings();

    // add multiple entries with invalid field values
    addExceptionEntryFieldValue('a', 0);
    cy.get(ADD_AND_BTN).click();
    addExceptionEntryFieldValue('b', 1);
    cy.get(ADD_AND_BTN).click();
    addExceptionEntryFieldValue('c', 2);

    // delete second item, invalid values 'a' and 'c' should remain
    cy.get(ENTRY_DELETE_BTN).eq(1).click();
    cy.get(FIELD_INPUT).eq(0).should('have.text', 'a');
    cy.get(FIELD_INPUT).eq(1).should('have.text', 'c');

    closeExceptionBuilderModal();
  });

  it('Does not overwrite invalid values or-ed together', () => {
    openExceptionModalFromRuleSettings();
    cy.get(LOADING_SPINNER).should('not.exist');

    // exception item 1
    addExceptionEntryFieldValue('a', 0);
    cy.get(ADD_AND_BTN).click();
    addExceptionEntryFieldValue('b', 1);

    // exception item 2
    cy.get(ADD_OR_BTN).click();
    addExceptionEntryFieldValue('c', 2);
    cy.get(ADD_AND_BTN).click();
    addExceptionEntryFieldValue('d', 3);
    cy.get(ADD_AND_BTN).click();
    addExceptionEntryFieldValue('e', 4);

    // delete single entry from exception item 2
    cy.get(ENTRY_DELETE_BTN).eq(3).click();
    cy.get(FIELD_INPUT).eq(0).should('have.text', 'a');
    cy.get(FIELD_INPUT).eq(1).should('have.text', 'b');
    cy.get(FIELD_INPUT).eq(2).should('have.text', 'c');
    cy.get(FIELD_INPUT).eq(3).should('have.text', 'e');

    // delete remaining entries in exception item 2
    cy.get(ENTRY_DELETE_BTN).eq(2).click();
    cy.get(ENTRY_DELETE_BTN).eq(2).click();
    cy.get(FIELD_INPUT).eq(0).should('have.text', 'a');
    cy.get(FIELD_INPUT).eq(1).should('have.text', 'b');
    cy.get(FIELD_INPUT).eq(2).should('not.exist');

    closeExceptionBuilderModal();
  });

  it('Does not overwrite invalid values of nested entry items', () => {
    openExceptionModalFromRuleSettings();
    cy.get(LOADING_SPINNER).should('not.exist');

    // exception item 1
    addExceptionEntryFieldValue('a', 0);
    cy.get(ADD_AND_BTN).click();
    addExceptionEntryFieldValue('b', 1);

    // exception item 2 with nested field
    cy.get(ADD_OR_BTN).click();
    addExceptionEntryFieldValue('c', 2);
    cy.get(ADD_NESTED_BTN).click();

    // closeExceptionBuilderModal();
  });
});
