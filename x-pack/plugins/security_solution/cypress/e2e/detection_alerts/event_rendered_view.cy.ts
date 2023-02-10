/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getNewRule } from '../../objects/rule';
import { EVENT_SUMMARY_ALERT_RENDERER_CONTENT, EVENT_SUMMARY_COLUMN } from '../../screens/alerts';
import { ALERT_RENDERER_HOST_NAME } from '../../screens/common/event_renderer';
import { FIELDS_BROWSER_VIEW_BUTTON } from '../../screens/fields_browser';
import {
  DATA_GRID_COLUMN_ORDER_BTN,
  DATA_GRID_FIELD_SORT_BTN,
  TOP_N_ALERT_HISTOGRAM,
  TOP_N_CONTAINER_CLOSE_BTN,
} from '../../screens/shared';
import { HOVER_ACTIONS } from '../../screens/timeline';
import {
  switchAlertTableToEventRenderedView,
  waitForAlerts,
  waitForTopNHistogramToLoad,
} from '../../tasks/alerts';
import { createCustomRuleEnabled } from '../../tasks/api_calls/rules';
import { cleanKibana } from '../../tasks/common';
import { login, visit } from '../../tasks/login';
import { ALERTS_URL } from '../../urls/navigation';

describe('Test Event Rendered View', { testIsolation: false }, () => {
  before(() => {
    cleanKibana();
    login();
    createCustomRuleEnabled(getNewRule(), 'new custom rule');
    visit(ALERTS_URL);
    waitForAlerts();
    switchAlertTableToEventRenderedView();
  });

  it('Field Browser is not visible', () => {
    cy.get(FIELDS_BROWSER_VIEW_BUTTON).should('not.exist');
  });

  it('Sorting control is not visible', () => {
    cy.get(DATA_GRID_FIELD_SORT_BTN).should('not.be.visible');
  });

  it('Column Order button is not visible', () => {
    cy.get(DATA_GRID_COLUMN_ORDER_BTN).should('not.exist');
  });

  it('Event Summary Column + Hover Actions', () => {
    cy.get(EVENT_SUMMARY_COLUMN).should('be.visible');
    cy.get(EVENT_SUMMARY_ALERT_RENDERER_CONTENT).should('be.visible');

    cy.get(ALERT_RENDERER_HOST_NAME).first().trigger('mouseover');

    cy.get(HOVER_ACTIONS.SHOW_TOP).trigger('click');
    waitForTopNHistogramToLoad();
    cy.get(TOP_N_ALERT_HISTOGRAM).should('be.visible');
    cy.get(TOP_N_CONTAINER_CLOSE_BTN).trigger('click');
  });
});
