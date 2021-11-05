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

describe('Create DataView runtime field', () => {
  before(() => {
    cleanKibana();
  });

  it('adds field to alert table', () => {
    const fieldName = 'field.name.alert.page';
    loginAndWaitForPage(ALERTS_URL);
    waitForAlertsPanelToBeLoaded();
    waitForAlertsIndexToBeCreated();
    createCustomRuleActivated(getNewRule());
    refreshPage();
    waitForAlertsToPopulate(500);
    openEventsViewerFieldsBrowser();

    cy.get('[data-test-subj="create-field"]').click();
    cy.get('.indexPatternFieldEditorMaskOverlay').find('[data-test-subj="input"]').type(fieldName);
    cy.get('[data-test-subj="fieldSaveButton"]').click();

    cy.get(
      `[data-test-subj="events-viewer-panel"] [data-test-subj="dataGridHeaderCell-${fieldName}"]`
    ).should('exist');
  });

  it('adds field to timeline', () => {
    const fieldName = 'field.name.timeline';

    loginAndWaitForPage(HOSTS_URL);
    openTimelineUsingToggle();
    populateTimeline();
    openTimelineFieldsBrowser();

    cy.get('[data-test-subj="create-field"]').click();
    cy.get('.indexPatternFieldEditorMaskOverlay').find('[data-test-subj="input"]').type(fieldName);
    cy.get('[data-test-subj="fieldSaveButton"]').click();

    cy.get(`[data-test-subj="timeline"] [data-test-subj="header-text-${fieldName}"]`).should(
      'exist'
    );
  });
});
