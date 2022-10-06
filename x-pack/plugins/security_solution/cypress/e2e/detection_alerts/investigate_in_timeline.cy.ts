/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getNewRule } from '../../objects/rule';
import { SELECTED_ALERTS } from '../../screens/alerts';
import {
  SELECT_ALL_EVENTS,
  SELECT_EVENTS_ACTION_ADD_BULK_TO_TIMELINE,
} from '../../screens/common/controls';
import { EVENT_VIEWER_CHECKBOX } from '../../screens/hosts/events';
import {
  ALERT_TABLE_FILE_NAME_HEADER,
  ALERT_TABLE_FILE_NAME_VALUES,
  ALERT_TABLE_SEVERITY_VALUES,
  PROVIDER_BADGE,
  SERVER_SIDE_EVENT_COUNT,
} from '../../screens/timeline';

import {
  addAlertPropertyToTimeline,
  investigateFirstAlertInTimeline,
  scrollAlertTableColumnIntoView,
} from '../../tasks/alerts';
import { createCustomRuleEnabled } from '../../tasks/api_calls/rules';
import { cleanKibana } from '../../tasks/common';
import { waitForAlertsToPopulate } from '../../tasks/create_new_rule';
import { login, visit } from '../../tasks/login';
import { openActiveTimeline } from '../../tasks/timeline';

import { ALERTS_URL } from '../../urls/navigation';

describe('Alerts timeline', () => {
  before(() => {
    cleanKibana();
    login();
    createCustomRuleEnabled(getNewRule());
  });
  beforeEach(() => {
    visit(ALERTS_URL);
    waitForAlertsToPopulate();
  });

  it('Investigate alert in default timeline', () => {
    investigateFirstAlertInTimeline();
    cy.get(PROVIDER_BADGE)
      .first()
      .invoke('text')
      .then((eventId) => {
        investigateFirstAlertInTimeline();
        cy.get(PROVIDER_BADGE).filter(':visible').should('have.text', eventId);
      });
  });

  it('Add a non-empty property to default timeline', () => {
    cy.get(ALERT_TABLE_SEVERITY_VALUES)
      .first()
      .invoke('text')
      .then((severityVal) => {
        addAlertPropertyToTimeline(ALERT_TABLE_SEVERITY_VALUES, 0);
        openActiveTimeline();
        cy.get(PROVIDER_BADGE)
          .first()
          .should('have.text', `kibana.alert.severity: "${severityVal}"`);
      });
  });

  it('Add an empty property to default timeline', () => {
    scrollAlertTableColumnIntoView(ALERT_TABLE_FILE_NAME_HEADER);
    addAlertPropertyToTimeline(ALERT_TABLE_FILE_NAME_VALUES, 0);
    openActiveTimeline();
    cy.get(PROVIDER_BADGE).first().should('have.text', 'NOT file.name exists');
  });

  it('Adding multiple alerts to the timeline should be successful', () => {
    // select all visible events
    cy.get(EVENT_VIEWER_CHECKBOX).first().scrollIntoView().click();
    cy.get(SELECTED_ALERTS).then((sub) => {
      const alertCountText = sub.text();
      const alertCount = alertCountText.split(' ')[1];
      sub.trigger('click');
      cy.get(SELECT_EVENTS_ACTION_ADD_BULK_TO_TIMELINE).click();
      cy.get('body').should('contain.text', `${alertCount} event IDs`);
      cy.get(SERVER_SIDE_EVENT_COUNT).should('contain.text', alertCount);
    });
  });

  it('When selected all alerts are selected, bulk action should be disabled', () => {
    cy.get(EVENT_VIEWER_CHECKBOX).first().scrollIntoView().click();
    cy.get(SELECT_ALL_EVENTS).click();
    cy.get(SELECTED_ALERTS).click();
    cy.get(SELECT_EVENTS_ACTION_ADD_BULK_TO_TIMELINE).should('be.disabled');
  });
});
