/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getNewRule } from '../../objects/rule';
import {
  ALERT_TABLE_FILE_NAME_HEADER,
  ALERT_TABLE_FILE_NAME_VALUES,
  ALERT_TABLE_SEVERITY_VALUES,
  PROVIDER_BADGE,
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
import { fillAddFilterForm, openAddFilterPopover } from '../../tasks/search_bar';

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
        scrollAlertTableColumnIntoView(ALERT_TABLE_FILE_NAME_HEADER);
        addAlertPropertyToTimeline(ALERT_TABLE_SEVERITY_VALUES, 0);
        openActiveTimeline();
        cy.get(PROVIDER_BADGE)
          .first()
          .should('have.text', `kibana.alert.severity: "${severityVal}"`);
      });
  });

  it('Add an empty property to default timeline', () => {
    // add condition to make sure the field is empty
    openAddFilterPopover();
    fillAddFilterForm({ key: 'file.name', operator: 'does not exist' });
    scrollAlertTableColumnIntoView(ALERT_TABLE_FILE_NAME_HEADER);
    addAlertPropertyToTimeline(ALERT_TABLE_FILE_NAME_VALUES, 0);
    openActiveTimeline();
    cy.get(PROVIDER_BADGE).first().should('have.text', 'NOT file.name exists');
  });
});
