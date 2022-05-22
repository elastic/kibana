/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ALERT_FLYOUT,
  CELL_TEXT,
  JSON_TEXT,
  TABLE_CONTAINER,
  TABLE_ROWS,
  SUMMARY_VIEW_PREVALENCE_CELL,
  SUMMARY_VIEW_INVESTIGATE_IN_TIMELINE_BUTTON,
} from '../../screens/alerts_details';
import { QUERY_TAB_BUTTON, TIMELINE_TITLE } from '../../screens/timeline';

import { expandFirstAlert } from '../../tasks/alerts';
import { openJsonView, openOverview, openTable } from '../../tasks/alerts_details';
import { createCustomRuleEnabled } from '../../tasks/api_calls/rules';
import { cleanKibana } from '../../tasks/common';
import { waitForAlertsToPopulate } from '../../tasks/create_new_rule';
import { esArchiverLoad, esArchiverUnload } from '../../tasks/es_archiver';
import { login, visitWithoutDateRange } from '../../tasks/login';

import { getUnmappedRule } from '../../objects/rule';

import { ALERTS_URL } from '../../urls/navigation';
import { pageSelector } from '../../screens/alerts_detection_rules';

describe('Alert details with unmapped fields', () => {
  before(() => {
    cleanKibana();
    esArchiverLoad('unmapped_fields');
    login();
    createCustomRuleEnabled(getUnmappedRule());
    visitWithoutDateRange(ALERTS_URL);
    waitForAlertsToPopulate();
    expandFirstAlert();
  });
  after(() => {
    esArchiverUnload('unmapped_fields');
  });

  it('Displays the unmapped field on the JSON view', () => {
    const expectedUnmappedValue = ['This is the unmapped field'];

    openJsonView();

    cy.get(JSON_TEXT).then((x) => {
      const parsed = JSON.parse(x.text());
      expect(parsed.fields['unmapped']).to.equal(expectedUnmappedValue);
    });
  });

  it('Displays the unmapped field on the table', () => {
    const expectedUnmmappedField = {
      field: 'unmapped',
      text: 'This is the unmapped field',
    };

    openTable();
    cy.get(ALERT_FLYOUT).find(pageSelector(5)).click({ force: true });
    cy.get(ALERT_FLYOUT)
      .find(TABLE_ROWS)
      .within(() => {
        cy.get(CELL_TEXT).should('contain', expectedUnmmappedField.field);
        cy.get(CELL_TEXT).should('contain', expectedUnmmappedField.text);
      });
  });

  // This test makes sure that the table does not overflow horizontally
  it('Table does not scroll horizontally', () => {
    openTable();

    cy.get(ALERT_FLYOUT)
      .find(TABLE_CONTAINER)
      .within(($tableContainer) => {
        expect($tableContainer[0].scrollLeft).to.equal(0);

        // Due to the introduction of pagination on the table, a slight horizontal overflow has been introduced.
        // scroll ignores the `overflow-x:hidden` attribute and will still scroll the element if there is a hidden overflow
        // Updated the below to equal 4 to account for this and keep a test to make sure it doesn't grow
        $tableContainer[0].scroll({ left: 1000 });

        expect($tableContainer[0].scrollLeft).to.equal(4);
      });
  });

  it('Opens a new timeline investigation', () => {
    openOverview();

    cy.get(SUMMARY_VIEW_PREVALENCE_CELL)
      .invoke('text')
      .then((alertCount) => {
        // Click on the first button that lets us investigate in timeline
        cy.get(ALERT_FLYOUT).find(SUMMARY_VIEW_INVESTIGATE_IN_TIMELINE_BUTTON).click();

        // Make sure a new timeline is created and opened
        cy.get(TIMELINE_TITLE).should('contain.text', 'Untitled timeline');

        // The alert count in this timeline should match the count shown on the alert flyout
        cy.get(QUERY_TAB_BUTTON).should('contain.text', alertCount);
      });
  });
});
