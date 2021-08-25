/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ADD_ENDPOINT_EXCEPTION_ACTION_BTN,
  ADD_EXCEPTION_ACTION_BTN,
  ALERT_FLYOUT,
  CELL_TEXT,
  INVESTIGATE_IN_TIMELINE_BTN,
  JSON_LINES,
  TABLE_ROWS,
  TAKE_ACTION_BTN,
} from '../../screens/alerts_details';

import { expandFirstAlert, loadAlertsTableWithAlerts } from '../../tasks/alerts';
import { openJsonView, openTable, scrollJsonViewToBottom } from '../../tasks/alerts_details';
import { cleanKibana } from '../../tasks/common';
import { esArchiverLoad } from '../../tasks/es_archiver';

import { getUnmappedRule, getNewRule } from '../../objects/rule';
import { login, waitForPageWithoutDateRange } from '../../tasks/login';
import { ROLES } from '../../../common/test';
import { ALERTS_URL } from '../../urls/navigation';

describe('Alert details', () => {
  context('mapped fields', () => {
    beforeEach(() => {
      cleanKibana();
      loadAlertsTableWithAlerts(getNewRule(), 1);
      expandFirstAlert();
    });

    context('read only user', () => {
      beforeEach(() => {
        login(ROLES.reader);
        waitForPageWithoutDateRange(ALERTS_URL, ROLES.reader);
        expandFirstAlert();
      });

      it('Should limit actions user is able to take', () => {
        openJsonView();
        cy.get(TAKE_ACTION_BTN).should('be.visible');
        // go to panel take action button
        cy.get(TAKE_ACTION_BTN)
          .pipe(($el) => {
            $el.trigger('click');
            return $el;
          })
          .should('be.visible');

        // Actions that should be visible
        cy.get(INVESTIGATE_IN_TIMELINE_BTN).should('be.visible');

        // Actions that should not be visible
        cy.get(ADD_EXCEPTION_ACTION_BTN).should('not.exist');
        cy.get(ADD_ENDPOINT_EXCEPTION_ACTION_BTN).should('not.exist');
      });
    });

    it('Displays fields on the JSON view', () => {
      openJsonView();
      scrollJsonViewToBottom();

      cy.get(ALERT_FLYOUT).find(JSON_LINES).should('have.length.greaterThan', 0);
    });

    it('Displays fields on the table', () => {
      openTable();
      cy.get(ALERT_FLYOUT).find(TABLE_ROWS).should('have.length.greaterThan', 0);
    });
  });

  context('unmapped fields', () => {
    beforeEach(() => {
      cleanKibana();
      esArchiverLoad('unmapped_fields');
      loadAlertsTableWithAlerts(getUnmappedRule(), 1);
      expandFirstAlert();
    });

    it('Displays the unmapped field on the JSON view', () => {
      const expectedUnmappedField = { line: 2, text: '  "unmapped": "This is the unmapped field"' };

      openJsonView();
      scrollJsonViewToBottom();

      cy.get(ALERT_FLYOUT)
        .find(JSON_LINES)
        .then((elements) => {
          const length = elements.length;
          cy.wrap(elements)
            .eq(length - expectedUnmappedField.line)
            .invoke('text')
            .should('include', expectedUnmappedField.text);
        });
    });

    it('Displays the unmapped field on the table', () => {
      const expectedUnmmappedField = {
        row: 90,
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
});
