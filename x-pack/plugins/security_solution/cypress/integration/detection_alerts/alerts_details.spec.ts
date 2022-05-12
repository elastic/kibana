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
} from '../../screens/alerts_details';

import { expandFirstAlert } from '../../tasks/alerts';
import { openJsonView, openTable } from '../../tasks/alerts_details';
import { createCustomRuleEnabled } from '../../tasks/api_calls/rules';
import { cleanKibana } from '../../tasks/common';
import { waitForAlertsToPopulate } from '../../tasks/create_new_rule';
import { esArchiverLoad } from '../../tasks/es_archiver';
import { loginAndWaitForPageWithoutDateRange } from '../../tasks/login';
import { refreshPage } from '../../tasks/security_header';

import { getUnmappedRule } from '../../objects/rule';

import { ALERTS_URL } from '../../urls/navigation';
import { pageSelector } from '../../screens/alerts_detection_rules';

describe('Alert details with unmapped fields', () => {
  beforeEach(() => {
    cleanKibana();
    esArchiverLoad('unmapped_fields');
    loginAndWaitForPageWithoutDateRange(ALERTS_URL);
    createCustomRuleEnabled(getUnmappedRule());
    refreshPage();
    waitForAlertsToPopulate();
    expandFirstAlert();
  });

  it('Displays the unmapped field on the JSON view', () => {
    const expectedUnmappedValue = 'This is the unmapped field';

    openJsonView();

    cy.get(JSON_TEXT).then((x) => {
      const parsed = JSON.parse(x.text());
      expect(parsed._source.unmapped).to.equal(expectedUnmappedValue);
    });
  });

  // This test needs to be updated to not look for the field in a specific row, as it prevents us from adding/removing fields
  it.skip('Displays the unmapped field on the table', () => {
    const expectedUnmmappedField = {
      row: 83,
      field: 'unmapped',
      text: 'This is the unmapped field',
    };

    openTable();
    cy.get(ALERT_FLYOUT).find(pageSelector(5)).click({ force: true });
    cy.get(ALERT_FLYOUT)
      .find(TABLE_ROWS)
      .eq(expectedUnmmappedField.row)
      .within(() => {
        cy.get(CELL_TEXT).eq(2).should('have.text', expectedUnmmappedField.field);
        cy.get(CELL_TEXT).eq(4).should('have.text', expectedUnmmappedField.text);
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
});
