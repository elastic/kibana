/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { cleanKibana } from '../../tasks/common';

import { loginAndWaitForPage } from '../../tasks/login';
import { openTimelineUsingToggle } from '../../tasks/security_main';
import { openTimelineFieldsBrowser, populateTimeline } from '../../tasks/timeline';

import { HOSTS_URL, ALERTS_URL } from '../../urls/navigation';

import { waitForAlertsIndexToBeCreated, waitForAlertsPanelToBeLoaded } from '../../tasks/alerts';
import { createCustomRuleActivated } from '../../tasks/api_calls/rules';

import { getNewRule } from '../../objects/rule';
import { refreshPage } from '../../tasks/security_header';
import { waitForAlertsToPopulate } from '../../tasks/create_new_rule';
import { openEventsViewerFieldsBrowser } from '../../tasks/hosts/events';

describe('DataView runtime field', () => {
  before(() => {
    cleanKibana();
  });

  it('adds/edits/removes field from table', () => {
    const fieldName = 'field.name.alert.page';
    loginAndWaitForPage(ALERTS_URL);
    waitForAlertsPanelToBeLoaded();
    waitForAlertsIndexToBeCreated();
    createCustomRuleActivated(getNewRule());
    refreshPage();
    waitForAlertsToPopulate(500);

    // ADD
    openEventsViewerFieldsBrowser();
    addField(fieldName);

    cy.get(
      `[data-test-subj="events-viewer-panel"] [data-test-subj="dataGridHeaderCell-${fieldName}"]`
    ).should('exist');

    // EDIT
    const newFieldName = 'field.name.timeline-2';
    openEventsViewerFieldsBrowser();
    editField(fieldName, newFieldName);

    cy.get(
      `[data-test-subj="events-viewer-panel"] [data-test-subj="dataGridHeaderCell-${fieldName}"]`
    ).should('not.exist');
    cy.get(
      `[data-test-subj="events-viewer-panel"] [data-test-subj="dataGridHeaderCell-${newFieldName}"]`
    ).should('exist');

    // DELETE
    openEventsViewerFieldsBrowser();
    deleteField(newFieldName);

    cy.get(
      `[data-test-subj="events-viewer-panel"] [data-test-subj="dataGridHeaderCell-${newFieldName}"]`
    ).should('not.exist');
  });

  it('adds/edits/removes field from timeline', () => {
    const fieldName = 'field.name.timeline';

    loginAndWaitForPage(HOSTS_URL);
    openTimelineUsingToggle();
    populateTimeline();

    // ADD
    openTimelineFieldsBrowser();
    addField(fieldName);

    cy.get(`[data-test-subj="timeline"] [data-test-subj="header-text-${fieldName}"]`).should(
      'exist'
    );

    // EDIT
    const newFieldName = 'field.name.timeline-2';
    openTimelineFieldsBrowser();
    editField(fieldName, newFieldName);

    cy.get(`[data-test-subj="timeline"] [data-test-subj="header-text-${fieldName}"]`).should(
      'not.exist'
    );
    cy.get(`[data-test-subj="timeline"] [data-test-subj="header-text-${newFieldName}"]`).should(
      'exist'
    );

    // DELETE
    openTimelineFieldsBrowser();
    deleteField(newFieldName);

    cy.get(`[data-test-subj="timeline"] [data-test-subj="header-text-${newFieldName}"]`).should(
      'not.exist'
    );
  });
});

function deleteField(newFieldName: string) {
  cy.get('[data-test-subj="field-search"]').type(newFieldName);
  cy.get(`[aria-label="Delete"]`).click();

  cy.get('[data-test-subj="deleteModalConfirmText"]').type('REMOVE');

  cy.get('[data-test-subj="confirmModalConfirmButton"]').click();
}

function editField(fieldName: string, newFieldName: string) {
  cy.get('[data-test-subj="field-search"]').type(fieldName);
  cy.get(`[aria-label="Edit"]`).click();
  cy.get('.indexPatternFieldEditorMaskOverlay')
    .find('[data-test-subj="input"]')
    .clear()
    .type(newFieldName);
  cy.get('[data-test-subj="fieldSaveButton"]').click();

  cy.get('[data-test-subj="saveModalConfirmText"]').type('CHANGE');

  cy.get('[data-test-subj="confirmModalConfirmButton"]').click();
}

function addField(fieldName: string) {
  cy.get('[data-test-subj="create-field"]').click();
  cy.get('.indexPatternFieldEditorMaskOverlay').find('[data-test-subj="input"]').type(fieldName);
  cy.get('[data-test-subj="fieldSaveButton"]').click();
}
