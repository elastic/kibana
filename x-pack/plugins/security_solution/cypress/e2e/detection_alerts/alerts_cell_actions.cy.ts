/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getNewRule } from '../../objects/rule';
import { CELL_COPY_BUTTON, FILTER_BADGE, SHOW_TOP_N_HEADER } from '../../screens/alerts';
import {
  ALERT_TABLE_ACTIONS_HEADER,
  ALERT_TABLE_FILE_NAME_HEADER,
  ALERT_TABLE_FILE_NAME_VALUES,
  ALERT_TABLE_SEVERITY_HEADER,
  ALERT_TABLE_SEVERITY_VALUES,
  PROVIDER_BADGE,
} from '../../screens/timeline';

import {
  scrollAlertTableColumnIntoView,
  addAlertPropertyToTimeline,
  filterForAlertProperty,
  showTopNAlertProperty,
  clickExpandActions,
  filterOutAlertProperty,
  closeTopNAlertProperty,
} from '../../tasks/alerts';
import { createCustomRuleEnabled } from '../../tasks/api_calls/rules';
import { cleanKibana } from '../../tasks/common';
import { waitForAlertsToPopulate } from '../../tasks/create_new_rule';
import { login, visit } from '../../tasks/login';
import {
  clearKqlQueryBar,
  fillAddFilterForm,
  fillKqlQueryBar,
  openAddFilterPopover,
  removeKqlFilter,
} from '../../tasks/search_bar';
import { closeTimeline, openActiveTimeline, removeDataProvider } from '../../tasks/timeline';

import { ALERTS_URL } from '../../urls/navigation';
describe('Alerts cell actions', { testIsolation: false }, () => {
  before(() => {
    cleanKibana();
    login();
    createCustomRuleEnabled(getNewRule());
    visit(ALERTS_URL);
    waitForAlertsToPopulate();
  });

  describe('Filter', () => {
    afterEach(() => {
      removeKqlFilter();
      scrollAlertTableColumnIntoView(ALERT_TABLE_ACTIONS_HEADER);
    });

    it('should filter for a non-empty property', () => {
      cy.get(ALERT_TABLE_SEVERITY_VALUES)
        .first()
        .invoke('text')
        .then((severityVal) => {
          scrollAlertTableColumnIntoView(ALERT_TABLE_SEVERITY_HEADER);
          filterForAlertProperty(ALERT_TABLE_SEVERITY_VALUES, 0);
          cy.get(FILTER_BADGE).first().should('have.text', `kibana.alert.severity: ${severityVal}`);
        });
    });

    it('should filter for an empty property', () => {
      // add query condition to make sure the field is empty
      fillKqlQueryBar('not file.name: *{enter}');

      scrollAlertTableColumnIntoView(ALERT_TABLE_FILE_NAME_HEADER);
      filterForAlertProperty(ALERT_TABLE_FILE_NAME_VALUES, 0);

      cy.get(FILTER_BADGE).first().should('have.text', 'NOT file.name: exists');

      clearKqlQueryBar();
    });

    it('should filter out a non-empty property', () => {
      cy.get(ALERT_TABLE_SEVERITY_VALUES)
        .first()
        .invoke('text')
        .then((severityVal) => {
          scrollAlertTableColumnIntoView(ALERT_TABLE_SEVERITY_HEADER);
          filterOutAlertProperty(ALERT_TABLE_SEVERITY_VALUES, 0);
          cy.get(FILTER_BADGE)
            .first()
            .should('have.text', `NOT kibana.alert.severity: ${severityVal}`);
        });
    });

    it('should filter out an empty property', () => {
      // add query condition to make sure the field is empty
      fillKqlQueryBar('not file.name: *{enter}');

      scrollAlertTableColumnIntoView(ALERT_TABLE_FILE_NAME_HEADER);
      filterOutAlertProperty(ALERT_TABLE_FILE_NAME_VALUES, 0);

      cy.get(FILTER_BADGE).first().should('have.text', 'file.name: exists');

      clearKqlQueryBar();
    });
  });

  describe('Add to timeline', () => {
    afterEach(() => {
      removeDataProvider();
      closeTimeline();
      scrollAlertTableColumnIntoView(ALERT_TABLE_ACTIONS_HEADER);
    });

    it('should add a non-empty property to default timeline', () => {
      cy.get(ALERT_TABLE_SEVERITY_VALUES)
        .first()
        .invoke('text')
        .then((severityVal) => {
          scrollAlertTableColumnIntoView(ALERT_TABLE_SEVERITY_VALUES);
          addAlertPropertyToTimeline(ALERT_TABLE_SEVERITY_VALUES, 0);
          openActiveTimeline();
          cy.get(PROVIDER_BADGE)
            .first()
            .should('have.text', `kibana.alert.severity: "${severityVal}"`);
        });
    });

    it('should add an empty property to default timeline', () => {
      // add condition to make sure the field is empty
      openAddFilterPopover();

      fillAddFilterForm({ key: 'file.name', operator: 'does not exist' });
      scrollAlertTableColumnIntoView(ALERT_TABLE_FILE_NAME_HEADER);
      addAlertPropertyToTimeline(ALERT_TABLE_FILE_NAME_VALUES, 0);
      openActiveTimeline();
      cy.get(PROVIDER_BADGE).first().should('have.text', 'NOT file.name exists');
    });
  });

  describe('Show Top N', () => {
    afterEach(() => {
      closeTopNAlertProperty();
      scrollAlertTableColumnIntoView(ALERT_TABLE_ACTIONS_HEADER);
    });

    it('should show top for a property', () => {
      cy.get(ALERT_TABLE_SEVERITY_VALUES)
        .first()
        .invoke('text')
        .then(() => {
          scrollAlertTableColumnIntoView(ALERT_TABLE_SEVERITY_VALUES);
          showTopNAlertProperty(ALERT_TABLE_SEVERITY_VALUES, 0);
          cy.get(SHOW_TOP_N_HEADER).first().should('have.text', `Top kibana.alert.severity`);
        });
    });
  });

  describe('Copy to clipboard', () => {
    afterEach(() => {
      scrollAlertTableColumnIntoView(ALERT_TABLE_ACTIONS_HEADER);
    });

    it('should copy to clipboard', () => {
      cy.get(ALERT_TABLE_SEVERITY_VALUES)
        .first()
        .invoke('text')
        .then(() => {
          scrollAlertTableColumnIntoView(ALERT_TABLE_SEVERITY_VALUES);
          cy.window().then((win) => {
            cy.stub(win, 'prompt').returns('DISABLED WINDOW PROMPT');
          });
          clickExpandActions(ALERT_TABLE_SEVERITY_VALUES, 0);
          cy.get(CELL_COPY_BUTTON).should('exist');
          // We are not able to test the "copy to clipboard" action execution
          // due to browsers security limitation accessing the clipboard services.
          // We assume external `copy` library works
        });
    });
  });
});
