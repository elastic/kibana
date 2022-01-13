/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { navigateTo } from '../../tasks/navigation';
import {
  deleteAndConfirm,
  findAndClickButton,
  findFormFieldByRowsLabelAndType,
  inputQuery,
} from '../../tasks/live_query';
import { login } from '../../tasks/login';
import { ArchiverMethod, runKbnArchiverScript } from '../../tasks/archiver';
import { preparePack } from '../../tasks/packs';

describe('SuperUser - Packs', () => {
  const SAVED_QUERY_ID = 'Saved-Query-Id';
  const PACK_NAME = 'Pack-name';
  const NEW_QUERY_NAME = 'new-query-name';

  before(() => {
    runKbnArchiverScript(ArchiverMethod.LOAD, 'saved_query');
  });
  beforeEach(() => {
    login();
    navigateTo('/app/osquery');
  });

  after(() => {
    runKbnArchiverScript(ArchiverMethod.UNLOAD, 'saved_query');
  });

  it('should add a pack from a saved query', () => {
    cy.contains('Packs').click();
    findAndClickButton('Add pack');
    findFormFieldByRowsLabelAndType('Name', PACK_NAME);
    findFormFieldByRowsLabelAndType('Description (optional)', 'Pack description');
    findFormFieldByRowsLabelAndType(
      'Scheduled agent policies (optional)',
      'Default Fleet Server policy'
    );
    cy.react('List').first().click();
    findAndClickButton('Add query');
    cy.contains('Attach next query');
    cy.react('EuiComboBox', { props: { placeholder: 'Search for saved queries' } })
      .click()
      .type(SAVED_QUERY_ID);
    cy.react('List').first().click();
    cy.react('EuiFormRow', { props: { label: 'Interval (s)' } })
      .click()
      .clear()
      .type('10');
    cy.react('EuiFlyoutFooter').react('EuiButton').contains('Save').click();
    cy.react('EuiTableRow').contains(SAVED_QUERY_ID);
    findAndClickButton('Save pack');
    cy.contains('Save and deploy changes');
    findAndClickButton('Save and deploy changes');
    cy.contains(PACK_NAME);
  });

  it('to click the edit button and edit pack', () => {
    preparePack(PACK_NAME, SAVED_QUERY_ID);
    findAndClickButton('Edit');
    cy.contains(`Edit ${PACK_NAME}`);
    findAndClickButton('Add query');
    cy.contains('Attach next query');
    inputQuery('select * from uptime');
    findFormFieldByRowsLabelAndType('ID', NEW_QUERY_NAME);
    cy.react('EuiFlyoutFooter').react('EuiButton').contains('Save').click();
    cy.react('EuiTableRow').contains(NEW_QUERY_NAME);
    findAndClickButton('Update pack');
    cy.contains('Save and deploy changes');
    findAndClickButton('Save and deploy changes');
  });
  // THIS TESTS TAKES TOO LONG FOR NOW - LET ME THINK IT THROUGH
  // it('to click the icon and visit discover', () => {
  //   preparePack(PACK_NAME, SAVED_QUERY_ID);
  //   cy.react('CustomItemAction', {
  //     props: { index: 0, item: { id: SAVED_QUERY_ID } },
  //   }).click();
  //   cy.get('[data-test-subj="superDatePickerToggleQuickMenuButton"').click();
  //   cy.get('[data-test-subj="superDatePickerToggleRefreshButton"').click();
  //   cy.get('[data-test-subj="superDatePickerRefreshIntervalInput"').clear().type('10');
  //   cy.get('button').contains('Apply').click();
  //   cy.get('[data-test-subj="discoverDocTable"]', { timeout: 60000 }).contains(
  //     `pack_${PACK_NAME}_${SAVED_QUERY_ID}`
  //   );
  // });
  // it('by clicking in Lens button', () => {
  // preparePack(PACK_NAME, SAVED_QUERY_ID);
  //   cy.react('CustomItemAction', {
  //     props: { index: 1, item: { id: SAVED_QUERY_ID } },
  //   }).click();
  //   cy.get('[data-test-subj="lnsWorkspace"]');
  //   cy.get('[data-test-subj="breadcrumbs"]').contains(
  //     `Action pack_${PACK_NAME}_${SAVED_QUERY_ID} results`
  //   );
  // });
  it('to click delete button', () => {
    preparePack(PACK_NAME, SAVED_QUERY_ID);
    findAndClickButton('Edit');
    deleteAndConfirm('pack');
  });
});
