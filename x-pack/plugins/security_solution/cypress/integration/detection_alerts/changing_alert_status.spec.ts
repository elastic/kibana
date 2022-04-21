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
  ALERTS_TREND_SIGNAL_RULE_NAME_PANEL,
  SELECTED_ALERTS,
} from '../../screens/alerts';

import {
  selectNumberOfAlerts,
  waitForAlerts,
  markAcknowledgedFirstAlert,
  goToAcknowledgedAlerts,
  closeAlerts,
  closeFirstAlert,
  goToClosedAlerts,
  goToOpenedAlerts,
  openAlerts,
  openFirstAlert,
} from '../../tasks/alerts';
import { createCustomRuleEnabled } from '../../tasks/api_calls/rules';
import { cleanKibana, deleteAlertsAndRules } from '../../tasks/common';
import { waitForAlertsToPopulate } from '../../tasks/create_new_rule';
import { esArchiverLoad, esArchiverUnload } from '../../tasks/es_archiver';
import { login, visit } from '../../tasks/login';

import { ALERTS_URL } from '../../urls/navigation';

describe('Changing alert status', () => {
  before(() => {
    esArchiverLoad('auditbeat_big');
    cleanKibana();
    login();
  });
  after(() => {
    esArchiverUnload('auditbeat_big');
  });
  context('Opening alerts', () => {
    beforeEach(() => {
      createCustomRuleEnabled(getNewRule());
      visit(ALERTS_URL);
      waitForAlertsToPopulate();
      selectNumberOfAlerts(3);
      cy.get(SELECTED_ALERTS).should('have.text', `Selected 3 alerts`);
      closeAlerts();
      waitForAlerts();
    });

    it('Open one alert when more than one closed alerts are selected', () => {
      waitForAlertsToPopulate();
      cy.get(ALERTS_COUNT)
        .invoke('text')
        .then((numberOfOpenedAlertsText) => {
          const numberOfOpenedAlerts = parseInt(numberOfOpenedAlertsText, 10);
          goToClosedAlerts();
          cy.get(ALERTS_COUNT)
            .invoke('text')
            .then((alertNumberString) => {
              const numberOfAlerts = alertNumberString.split(' ')[0];
              const numberOfAlertsToBeOpened = 1;
              const numberOfAlertsToBeSelected = 3;

              cy.get(TAKE_ACTION_POPOVER_BTN).should('not.exist');
              selectNumberOfAlerts(numberOfAlertsToBeSelected);
              cy.get(SELECTED_ALERTS).should(
                'have.text',
                `Selected ${numberOfAlertsToBeSelected} alerts`
              );

              // TODO: Popover not shwing up in cypress UI, but code is in the UtilityBar
              // cy.get(TAKE_ACTION_POPOVER_BTN).should('not.have.attr', 'disabled');

              openFirstAlert();
              waitForAlerts();

              const expectedNumberOfAlerts = +numberOfAlerts - numberOfAlertsToBeOpened;
              cy.get(ALERTS_COUNT).should('have.text', `${expectedNumberOfAlerts} alerts`);
              cy.get(ALERT_COUNT_TABLE_FIRST_ROW_COUNT).should(
                'have.text',
                `${expectedNumberOfAlerts}`
              );

              goToOpenedAlerts();
              waitForAlerts();

              cy.get(ALERTS_COUNT).should(
                'have.text',
                `${numberOfOpenedAlerts + numberOfAlertsToBeOpened} alerts`.toString()
              );
              cy.get(ALERT_COUNT_TABLE_FIRST_ROW_COUNT).should(
                'have.text',
                `${numberOfOpenedAlerts + numberOfAlertsToBeOpened}`
              );
            });
        });
    });
  });
  context('Marking alerts as acknowledged', () => {
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
  context('Closing alerts', () => {
    beforeEach(() => {
      deleteAlertsAndRules();
      createCustomRuleEnabled(getNewRule(), '1', '100m', 100);
      visit(ALERTS_URL);
      waitForAlertsToPopulate();
    });
    it('Closes and opens alerts', () => {
      const numberOfAlertsToBeClosed = 3;
      cy.get(ALERTS_COUNT)
        .invoke('text')
        .then((alertNumberString) => {
          const numberOfAlerts = alertNumberString.split(' ')[0];
          cy.get(ALERTS_COUNT).should('have.text', `${numberOfAlerts} alerts`);
          cy.get(ALERT_COUNT_TABLE_FIRST_ROW_COUNT).should('have.text', `${numberOfAlerts}`);

          selectNumberOfAlerts(numberOfAlertsToBeClosed);

          cy.get(SELECTED_ALERTS).should(
            'have.text',
            `Selected ${numberOfAlertsToBeClosed} alerts`
          );

          closeAlerts();
          waitForAlerts();

          const expectedNumberOfAlertsAfterClosing = +numberOfAlerts - numberOfAlertsToBeClosed;
          cy.get(ALERTS_COUNT).should('have.text', `${expectedNumberOfAlertsAfterClosing} alerts`);
          cy.get(ALERT_COUNT_TABLE_FIRST_ROW_COUNT).should(
            'have.text',
            `${expectedNumberOfAlertsAfterClosing}`
          );

          goToClosedAlerts();
          waitForAlerts();

          cy.get(ALERTS_COUNT).should('have.text', `${numberOfAlertsToBeClosed} alerts`);

          const numberOfAlertsToBeOpened = 1;
          selectNumberOfAlerts(numberOfAlertsToBeOpened);

          cy.get(SELECTED_ALERTS).should('have.text', `Selected ${numberOfAlertsToBeOpened} alert`);

          openAlerts();
          waitForAlerts();

          const expectedNumberOfClosedAlertsAfterOpened = 2;
          cy.get(ALERTS_COUNT).should(
            'have.text',
            `${expectedNumberOfClosedAlertsAfterOpened} alerts`
          );
          cy.get(ALERT_COUNT_TABLE_FIRST_ROW_COUNT).should(
            'have.text',
            `${expectedNumberOfClosedAlertsAfterOpened}`
          );

          goToOpenedAlerts();
          waitForAlerts();

          const expectedNumberOfOpenedAlerts =
            +numberOfAlerts - expectedNumberOfClosedAlertsAfterOpened;

          cy.get(ALERTS_COUNT).should('have.text', `${expectedNumberOfOpenedAlerts} alerts`);
          cy.get(ALERT_COUNT_TABLE_FIRST_ROW_COUNT).should(
            'have.text',
            `${expectedNumberOfOpenedAlerts}`
          );
        });
    });

    it('Closes one alert when more than one opened alerts are selected', () => {
      cy.get(ALERTS_COUNT)
        .invoke('text')
        .then((alertNumberString) => {
          const numberOfAlerts = alertNumberString.split(' ')[0];
          const numberOfAlertsToBeClosed = 1;
          const numberOfAlertsToBeSelected = 3;

          cy.get(TAKE_ACTION_POPOVER_BTN).should('not.exist');
          selectNumberOfAlerts(numberOfAlertsToBeSelected);
          cy.get(TAKE_ACTION_POPOVER_BTN).should('exist');

          closeFirstAlert();
          waitForAlerts();

          const expectedNumberOfAlerts = +numberOfAlerts - numberOfAlertsToBeClosed;
          cy.get(ALERTS_COUNT).should('have.text', `${expectedNumberOfAlerts} alerts`);
          cy.get(ALERT_COUNT_TABLE_FIRST_ROW_COUNT).should(
            'have.text',
            `${expectedNumberOfAlerts}`
          );

          goToClosedAlerts();
          waitForAlerts();

          cy.get(ALERTS_COUNT).should('have.text', `${numberOfAlertsToBeClosed} alert`);
          cy.get(ALERT_COUNT_TABLE_FIRST_ROW_COUNT).should(
            'have.text',
            `${numberOfAlertsToBeClosed}`
          );
        });
    });

    it('Updates trend histogram whenever alert status is updated in table', () => {
      const numberOfAlertsToBeClosed = 1;
      cy.get(ALERTS_COUNT)
        .invoke('text')
        .then((alertNumberString) => {
          const numberOfAlerts = alertNumberString.split(' ')[0];
          cy.get(ALERTS_COUNT).should('have.text', `${numberOfAlerts} alerts`);
          cy.get(ALERT_COUNT_TABLE_FIRST_ROW_COUNT).should('have.text', `${numberOfAlerts}`);

          selectNumberOfAlerts(numberOfAlertsToBeClosed);

          cy.get(SELECTED_ALERTS).should('have.text', `Selected ${numberOfAlertsToBeClosed} alert`);

          closeAlerts();
          waitForAlerts();

          const expectedNumberOfAlertsAfterClosing = +numberOfAlerts - numberOfAlertsToBeClosed;
          cy.get(ALERTS_COUNT).should('have.text', `${expectedNumberOfAlertsAfterClosing} alerts`);
          cy.get(ALERT_COUNT_TABLE_FIRST_ROW_COUNT).should(
            'have.text',
            `${expectedNumberOfAlertsAfterClosing}`
          );

          goToClosedAlerts();
          waitForAlerts();

          cy.get(ALERTS_COUNT).should('have.text', `${numberOfAlertsToBeClosed} alert`);

          const numberOfAlertsToBeOpened = 1;
          selectNumberOfAlerts(numberOfAlertsToBeOpened);

          cy.get(SELECTED_ALERTS).should('have.text', `Selected ${numberOfAlertsToBeOpened} alert`);
          cy.get(ALERTS_TREND_SIGNAL_RULE_NAME_PANEL).should('exist');

          openAlerts();
          waitForAlerts();

          cy.get(ALERTS_COUNT).should('not.exist');
          cy.get(ALERT_COUNT_TABLE_FIRST_ROW_COUNT).should('not.exist');
          cy.get(ALERTS_TREND_SIGNAL_RULE_NAME_PANEL).should('not.exist');
        });
    });
  });

  context('Changing alert status with read only role', () => {
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

    it('Closes alerts', () => {
      const numberOfAlertsToBeClosed = 3;
      cy.get(ALERTS_COUNT)
        .invoke('text')
        .then((alertNumberString) => {
          const numberOfAlerts = alertNumberString.split(' ')[0];
          cy.get(ALERTS_COUNT).should('have.text', `${numberOfAlerts} alerts`);
          cy.get(ALERT_COUNT_TABLE_FIRST_ROW_COUNT).should('have.text', `${numberOfAlerts}`);

          selectNumberOfAlerts(numberOfAlertsToBeClosed);

          cy.get(SELECTED_ALERTS).should(
            'have.text',
            `Selected ${numberOfAlertsToBeClosed} alerts`
          );

          closeAlerts();
          waitForAlerts();

          const expectedNumberOfAlertsAfterClosing = +numberOfAlerts - numberOfAlertsToBeClosed;
          cy.get(ALERTS_COUNT).should('have.text', `${expectedNumberOfAlertsAfterClosing} alerts`);
          cy.get(ALERT_COUNT_TABLE_FIRST_ROW_COUNT).should(
            'have.text',
            `${expectedNumberOfAlertsAfterClosing}`
          );

          goToClosedAlerts();
          waitForAlerts();

          cy.get(ALERTS_COUNT).should('have.text', `${numberOfAlertsToBeClosed} alerts`);
        });
    });
  });
});
