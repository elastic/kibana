/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ALERT_FLYOUT,
  CELL_TEXT,
  COPY_ALERT_FLYOUT_LINK,
  JSON_TEXT,
  OVERVIEW_RULE,
  TABLE_CONTAINER,
  TABLE_ROWS,
} from '../../screens/alerts_details';
import { closeAlertFlyout, expandFirstAlert } from '../../tasks/alerts';
import { filterBy, openJsonView, openTable } from '../../tasks/alerts_details';
import { createRule } from '../../tasks/api_calls/rules';
import { cleanKibana } from '../../tasks/common';
import { waitForAlertsToPopulate } from '../../tasks/create_new_rule';
import { esArchiverLoad, esArchiverUnload } from '../../tasks/es_archiver';
import { login, visit, visitWithoutDateRange } from '../../tasks/login';
import { getUnmappedRule, getNewRule } from '../../objects/rule';
import { ALERTS_URL } from '../../urls/navigation';
import { tablePageSelector } from '../../screens/table_pagination';
import { ALERTS_COUNT } from '../../screens/alerts';

describe('Alert details flyout', () => {
  describe('With unmapped fields', { testIsolation: false }, () => {
    before(() => {
      cleanKibana();
      esArchiverLoad('unmapped_fields');
      login();
      createRule(getUnmappedRule());
      visitWithoutDateRange(ALERTS_URL);
      waitForAlertsToPopulate();
      expandFirstAlert();
    });

    after(() => {
      esArchiverUnload('unmapped_fields');
    });

    it('should display the unmapped field on the JSON view', () => {
      const expectedUnmappedValue = 'This is the unmapped field';

      openJsonView();

      cy.get(JSON_TEXT).then((x) => {
        const parsed = JSON.parse(x.text());
        expect(parsed.fields.unmapped[0]).to.equal(expectedUnmappedValue);
      });
    });

    it('should displays the unmapped field on the table', () => {
      const expectedUnmappedField = {
        field: 'unmapped',
        text: 'This is the unmapped field',
      };

      openTable();
      cy.get(ALERT_FLYOUT).find(tablePageSelector(6)).click({ force: true });
      cy.get(ALERT_FLYOUT)
        .find(TABLE_ROWS)
        .last()
        .within(() => {
          cy.get(CELL_TEXT).should('contain', expectedUnmappedField.field);
          cy.get(CELL_TEXT).should('contain', expectedUnmappedField.text);
        });
    });

    // This test makes sure that the table does not overflow horizontally
    it('table should not scroll horizontally', () => {
      openTable();

      cy.get(ALERT_FLYOUT)
        .find(TABLE_CONTAINER)
        .within(($tableContainer) => {
          expect($tableContainer[0].scrollLeft).to.equal(0);

          // Due to the introduction of pagination on the table, a slight horizontal overflow has been introduced.
          // scroll ignores the `overflow-x:hidden` attribute and will still scroll the element if there is a hidden overflow
          // Updated the below to < 5 to account for this and keep a test to make sure it doesn't grow
          $tableContainer[0].scroll({ left: 1000 });

          expect($tableContainer[0].scrollLeft).to.be.lessThan(5);
        });
    });
  });

  describe('Url state management', { testIsolation: false }, () => {
    const testRule = getNewRule();
    before(() => {
      cleanKibana();
      login();
      createRule(testRule);
      visit(ALERTS_URL);
      waitForAlertsToPopulate();
    });

    it('should store the flyout state in the url when it is opened', () => {
      expandFirstAlert();
      cy.get(OVERVIEW_RULE).should('be.visible');
      cy.url().should('include', 'eventFlyout=');
    });

    it('should remove the flyout state from the url when it is closed', () => {
      expandFirstAlert();
      cy.get(OVERVIEW_RULE).should('be.visible');
      closeAlertFlyout();
      cy.url().should('not.include', 'eventFlyout=');
    });

    it('should open the alert flyout when the page is refreshed', () => {
      expandFirstAlert();
      cy.get(OVERVIEW_RULE).should('be.visible');
      cy.reload();
      cy.get(OVERVIEW_RULE).should('be.visible');
      cy.get(OVERVIEW_RULE).then((field) => {
        expect(field).to.contain(testRule.name);
      });
    });

    it('should show the copy link button for the flyout', () => {
      expandFirstAlert();
      cy.get(COPY_ALERT_FLYOUT_LINK).should('be.visible');
    });

    it('should open the flyout given the custom url', () => {
      expandFirstAlert();
      openTable();
      filterBy('_id');
      cy.get('[data-test-subj="event-field-_id"]')
        .invoke('text')
        .then((alertId) => {
          cy.visit(`http://localhost:5620/app/security/alerts/redirect/${alertId}`);
          cy.get('[data-test-subj="unifiedQueryInput"]').should('have.text', `_id: ${alertId}`);
          cy.get(ALERTS_COUNT).should('have.text', '1 alert');
          cy.get(OVERVIEW_RULE).should('be.visible');
        });
    });
  });
});
