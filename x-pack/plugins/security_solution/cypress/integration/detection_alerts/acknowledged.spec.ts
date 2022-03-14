/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ROLES } from '../../../common/test';
import { getNewRule } from '../../objects/rule';
import {
  ALERTS_COUNT,
  TAKE_ACTION_POPOVER_BTN,
  ALERT_COUNT_TABLE_FIRST_ROW_COUNT,
} from '../../screens/alerts';

import {
  selectNumberOfAlerts,
  waitForAlerts,
  markAcknowledgedFirstAlert,
  goToAcknowledgedAlerts,
} from '../../tasks/alerts';
import { createCustomRuleEnabled } from '../../tasks/api_calls/rules';
import { cleanKibana, deleteAlertsAndRules } from '../../tasks/common';
import { waitForAlertsToPopulate } from '../../tasks/create_new_rule';
import { esArchiverLoad, esArchiverUnload } from '../../tasks/es_archiver';
import { login, visit } from '../../tasks/login';

import { ALERTS_URL } from '../../urls/navigation';

describe('Acknowledging alerts', () => {
  before(() => {
    esArchiverLoad('auditbeat_big');
    cleanKibana();
  });
  after(() => {
    esArchiverUnload('auditbeat_big');
  });
  context('Marking alerts as acknowledged', () => {
    before(() => {
      login();
    });
    beforeEach(() => {
      deleteAlertsAndRules();
      createCustomRuleEnabled(getNewRule());
      visit(ALERTS_URL);
      waitForAlertsToPopulate();
    });
    it('Mark one alert as acknowledged when more than one open alerts are selected', () => {
      cy.get(ALERTS_COUNT)
        .invoke('text')
        .then((alertNumberString) => {
          const numberOfAlerts = alertNumberString.split(' ')[0];
          const numberOfAlertsToBeMarkedAcknowledged = 1;
          const numberOfAlertsToBeSelected = 3;

          cy.get(TAKE_ACTION_POPOVER_BTN).should('not.exist');
          selectNumberOfAlerts(numberOfAlertsToBeSelected);
          cy.get(TAKE_ACTION_POPOVER_BTN).should('exist');

          markAcknowledgedFirstAlert();
          const expectedNumberOfAlerts = +numberOfAlerts - numberOfAlertsToBeMarkedAcknowledged;
          cy.get(ALERTS_COUNT).should('have.text', `${expectedNumberOfAlerts} alerts`);
          cy.get(ALERT_COUNT_TABLE_FIRST_ROW_COUNT).should(
            'have.text',
            `${expectedNumberOfAlerts}`
          );

          goToAcknowledgedAlerts();
          waitForAlerts();

          cy.get(ALERTS_COUNT).should('have.text', `${numberOfAlertsToBeMarkedAcknowledged} alert`);
          cy.get(ALERT_COUNT_TABLE_FIRST_ROW_COUNT).should(
            'have.text',
            `${numberOfAlertsToBeMarkedAcknowledged}`
          );
        });
    });
  });

  context('Marking alerts as acknowledged with read only role', () => {
    before(() => {
      login(ROLES.t2_analyst);
    });
    beforeEach(() => {
      deleteAlertsAndRules();
      createCustomRuleEnabled(getNewRule());
      visit(ALERTS_URL);
      waitForAlertsToPopulate();
    });
    it('Mark one alert as acknowledged when more than one open alerts are selected', () => {
      cy.get(ALERTS_COUNT)
        .invoke('text')
        .then((alertNumberString) => {
          const numberOfAlerts = alertNumberString.split(' ')[0];
          const numberOfAlertsToBeMarkedAcknowledged = 1;
          const numberOfAlertsToBeSelected = 3;

          cy.get(TAKE_ACTION_POPOVER_BTN).should('not.exist');
          selectNumberOfAlerts(numberOfAlertsToBeSelected);
          cy.get(TAKE_ACTION_POPOVER_BTN).should('exist');

          markAcknowledgedFirstAlert();
          const expectedNumberOfAlerts = +numberOfAlerts - numberOfAlertsToBeMarkedAcknowledged;
          cy.get(ALERTS_COUNT).should('have.text', `${expectedNumberOfAlerts} alerts`);
          cy.get(ALERT_COUNT_TABLE_FIRST_ROW_COUNT).should(
            'have.text',
            `${expectedNumberOfAlerts}`
          );

          goToAcknowledgedAlerts();
          waitForAlerts();

          cy.get(ALERTS_COUNT).should('have.text', `${numberOfAlertsToBeMarkedAcknowledged} alert`);
          cy.get(ALERT_COUNT_TABLE_FIRST_ROW_COUNT).should(
            'have.text',
            `${numberOfAlertsToBeMarkedAcknowledged}`
          );
        });
    });
  });
});
