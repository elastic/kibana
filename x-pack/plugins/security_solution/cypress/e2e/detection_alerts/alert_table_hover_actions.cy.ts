/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getNewRule } from '../../objects/rule';
import { HOST_NAME, USER_NAME } from '../../screens/alerts';
import {
  ALERT_FLYOUT,
  ALERT_FLYOUT_CLOSE_BTN,
  CELL_EXPAND_VALUE,
  CELL_EXPANSION_POPOVER,
} from '../../screens/alerts_details';
import {
  GLOBAL_SEARCH_BAR_FILTER_ITEM,
  GLOBAL_SEARCH_BAR_FILTER_ITEM_DELETE,
} from '../../screens/search_bar';
import {
  DATA_GRID_FIELDS,
  GET_DATA_GRID_HEADER,
  ID_COLUMN_VALUES,
  TOP_N_ALERT_HISTOGRAM,
  TOP_N_CONTAINER_CLOSE_BTN,
} from '../../screens/shared';
import { HOVER_ACTIONS, TIMELINE_DATA_PROVIDERS_CONTAINER } from '../../screens/timeline';
import { waitForAlerts, waitForTopNHistogramToLoad } from '../../tasks/alerts';
import { createCustomRuleEnabled } from '../../tasks/api_calls/rules';
import { cleanKibana } from '../../tasks/common';
import { waitForAlertsToPopulate } from '../../tasks/create_new_rule';
import { login, visit } from '../../tasks/login';
import { addsFieldsToTimeline } from '../../tasks/rule_details';
import { closeTimelineUsingCloseButton } from '../../tasks/security_main';
import { openActiveTimeline } from '../../tasks/timeline';
import { ALERTS_URL } from '../../urls/navigation';

describe('Alerts Table : Hover Actions', () => {
  before(() => {
    cleanKibana();
    login();
    createCustomRuleEnabled(getNewRule(), 'new custom rule');
  });

  context('Id Column', { testIsolation: false }, () => {
    before(() => {
      visit(ALERTS_URL);
      waitForAlertsToPopulate();
      const idColName = DATA_GRID_FIELDS.ID.fieldName;
      addsFieldsToTimeline(idColName, [idColName]);
      cy.get(GET_DATA_GRID_HEADER(DATA_GRID_FIELDS.ID.fieldName)).should('be.visible');
    });
    beforeEach(() => {
      /*
       *
       * Since now alert table is different from the tables being used
       * in events, we have to create different set of tests for hover actions
       * for alerts table.
       *
       * These tests will be done on `_id` column since there can be difference
       * in how `_id` is supplied to the security solution by trigger actions table
       *
       * */
      waitForAlerts();
      cy.get(ID_COLUMN_VALUES).first().trigger('mouseover', { timeout: 5000 });
    });

    it('Filter For', () => {
      cy.get(ID_COLUMN_VALUES)
        .eq(0)
        .then(($el) => {
          const idTextValue = $el.text();
          cy.get(HOVER_ACTIONS.FILTER_FOR).should('exist');
          cy.get(HOVER_ACTIONS.FILTER_FOR).trigger('click', { force: true });
          cy.get(GLOBAL_SEARCH_BAR_FILTER_ITEM).should('contain.text', `_id: ${idTextValue}`);
          cy.get(GLOBAL_SEARCH_BAR_FILTER_ITEM_DELETE).trigger('click');
          cy.get(GLOBAL_SEARCH_BAR_FILTER_ITEM).should('not.exist');
        });
    });

    it('Filter Out', () => {
      cy.get(ID_COLUMN_VALUES)
        .eq(0)
        .then(($el) => {
          const idTextValue = $el.text();
          cy.get(HOVER_ACTIONS.FILTER_OUT).should('exist');
          cy.get(HOVER_ACTIONS.FILTER_OUT).trigger('click', { force: true });
          cy.get(GLOBAL_SEARCH_BAR_FILTER_ITEM).should('contain.text', `NOT _id: ${idTextValue}`);
          cy.get(GLOBAL_SEARCH_BAR_FILTER_ITEM_DELETE).trigger('click');
          cy.get(GLOBAL_SEARCH_BAR_FILTER_ITEM).should('not.exist');
        });
    });

    it('Add To Timeline', () => {
      cy.get(ID_COLUMN_VALUES)
        .eq(0)
        .then(($el) => {
          const idTextValue = $el.text();
          cy.get(HOVER_ACTIONS.ADD_TO_TIMELINE).should('exist');
          cy.get(HOVER_ACTIONS.ADD_TO_TIMELINE).trigger('click', { force: true });
          openActiveTimeline();
          cy.get(TIMELINE_DATA_PROVIDERS_CONTAINER).should('be.visible');
          cy.get(TIMELINE_DATA_PROVIDERS_CONTAINER).should('contain.text', idTextValue);
          closeTimelineUsingCloseButton();
        });
    });
  });

  context('Host Column', { testIsolation: false }, () => {
    before(() => {
      visit(ALERTS_URL);
      waitForAlerts();
    });
    beforeEach(() => {
      cy.get(HOST_NAME).first().trigger('mouseover', { timeout: 5000 });
      // we want to trigger second set of hover actions on host column
      // first is on _id column
      cy.get(CELL_EXPAND_VALUE).first().should('exist');
      cy.get(CELL_EXPAND_VALUE).first().trigger('click', { force: true });
      cy.get(CELL_EXPANSION_POPOVER).should('be.visible');
    });

    it('TopN', () => {
      cy.get(HOVER_ACTIONS.SHOW_TOP).should('be.visible').trigger('click');
      waitForTopNHistogramToLoad();
      cy.get(TOP_N_ALERT_HISTOGRAM).should('be.visible');
      cy.get(TOP_N_CONTAINER_CLOSE_BTN).trigger('click', { force: true });
      cy.get(TOP_N_ALERT_HISTOGRAM).should('not.exist');
      // close the expanded popover
      cy.get(CELL_EXPAND_VALUE).first().click({ force: true });
    });

    it('Host Summary', () => {
      cy.get(HOVER_ACTIONS.VIEW_HOST_SUMMARY).should('be.visible').trigger('click');
      cy.get(ALERT_FLYOUT).should('exist');
      /*
       *
       * Currently hover actions popover does not close automatically when clicked
       * on an action when using cypress
       *
       * */
      cy.get(ALERT_FLYOUT).trigger('click');
      cy.get(ALERT_FLYOUT_CLOSE_BTN).trigger('click');
      cy.get(ALERT_FLYOUT).should('not.exist');
    });
  });

  context('User  Column', { testIsolation: false }, () => {
    before(() => {
      visit(ALERTS_URL);
      waitForAlerts();
    });
    beforeEach(() => {
      cy.get('.euiDataGrid__virtualized').scrollTo('right');
      cy.get(USER_NAME).first().trigger('mouseover', { timeout: 5000 });
      // we want to trigger second set of hover actions on host column
      // first is on _id column
      cy.get(CELL_EXPAND_VALUE).first().should('exist');
      cy.get(CELL_EXPAND_VALUE).first().trigger('click', { force: true });
      cy.get(CELL_EXPANSION_POPOVER).should('be.visible');
    });

    it('User Summary', () => {
      cy.get(HOVER_ACTIONS.VIEW_USER_SUMMARY).should('be.visible').trigger('click');
      cy.get(ALERT_FLYOUT).should('exist');
      /*
       *
       * Currently hover actions popover does not close automatically when clicked
       * on an action when using cypress
       *
       * */
      cy.get(ALERT_FLYOUT).trigger('click');
      cy.get(ALERT_FLYOUT_CLOSE_BTN).trigger('click');
      cy.get(ALERT_FLYOUT).should('not.exist');
    });
  });
});
