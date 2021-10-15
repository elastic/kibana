/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALERT_FLYOUT, CELL_TEXT, JSON_TEXT, TABLE_ROWS } from '../../screens/alerts_details';

import {
  expandFirstAlert,
  waitForAlertsIndexToBeCreated,
  waitForAlertsPanelToBeLoaded,
} from '../../tasks/alerts';
import { openJsonView, openTable } from '../../tasks/alerts_details';
import { createCustomRuleActivated } from '../../tasks/api_calls/rules';
import { cleanKibana } from '../../tasks/common';
import { esArchiverLoad } from '../../tasks/es_archiver';
import { loginAndWaitForPageWithoutDateRange } from '../../tasks/login';

import { getUnmappedRule } from '../../objects/rule';

import { ALERTS_URL } from '../../urls/navigation';

describe('Alert details with unmapped fields', () => {
  beforeEach(() => {
    cleanKibana();
    esArchiverLoad('unmapped_fields');
    loginAndWaitForPageWithoutDateRange(ALERTS_URL);
    waitForAlertsPanelToBeLoaded();
    waitForAlertsIndexToBeCreated();
    createCustomRuleActivated(getUnmappedRule());
    loginAndWaitForPageWithoutDateRange(ALERTS_URL);
    waitForAlertsPanelToBeLoaded();
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

  it('Displays the unmapped field on the table', () => {
    const expectedUnmmappedField = {
      row: 86,
      field: 'unmapped',
      text: 'This is the unmapped field',
    };

    openTable();
    cy.get(ALERT_FLYOUT)
      .find(TABLE_ROWS)
      .eq(expectedUnmmappedField.row)
      .within(() => {
        cy.get(CELL_TEXT).eq(2).should('have.text', expectedUnmmappedField.field);
        cy.get(CELL_TEXT).eq(4).should('have.text', expectedUnmmappedField.text);
      });
  });
});
