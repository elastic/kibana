/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getNewRule } from '../../objects/rule';
import { ALERTS_COUNT } from '../../screens/alerts';

import {
  selectNumberOfAlerts,
  waitForAlerts,
  markAcknowledgedFirstAlert,
  goToAcknowledgedAlerts,
  selectTrendAnalysis,
} from '../../tasks/alerts';
import { createCustomRuleEnabled } from '../../tasks/api_calls/rules';
import { cleanKibana, deleteAlertsAndRules } from '../../tasks/common';
import { waitForAlertsToPopulate } from '../../tasks/create_new_rule';
import { checkCountsFromAlertsTrendHistogram } from '../../tasks/alerts';
import { esArchiverLoad, esArchiverUnload } from '../../tasks/es_archiver';
import { login, visit } from '../../tasks/login';

import { ALERTS_URL } from '../../urls/navigation';

describe('Alerts trend histogram', () => {
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
      deleteAlertsAndRules();
      createCustomRuleEnabled(getNewRule());
      visit(ALERTS_URL);
      waitForAlertsToPopulate();
      selectTrendAnalysis();
    });

    it('Display correct counts', () => {
      cy.get(ALERTS_COUNT)
        .invoke('text')
        .then((numberOfOpenedAlertsText) => {
          const numberOfOpenedAlerts = parseInt(numberOfOpenedAlertsText, 10);

          checkCountsFromAlertsTrendHistogram(numberOfOpenedAlerts);
        });
    });
  });

  context('Marking alerts as acknowledged', () => {
    beforeEach(() => {
      deleteAlertsAndRules();
      createCustomRuleEnabled(getNewRule());
      visit(ALERTS_URL);
      waitForAlertsToPopulate();
      selectTrendAnalysis();
    });
    it('Mark one alert as acknowledged when more than one open alerts are selected', () => {
      cy.get(ALERTS_COUNT)
        .invoke('text')
        .then((alertNumberString) => {
          const numberOfAlerts = parseInt(alertNumberString.split(' ')[0], 10);
          const numberOfAlertsToBeMarkedAcknowledged = 1;
          const numberOfAlertsToBeSelected = 3;

          selectNumberOfAlerts(numberOfAlertsToBeSelected);

          markAcknowledgedFirstAlert();
          const expectedNumberOfAlerts = numberOfAlerts - numberOfAlertsToBeMarkedAcknowledged;
          cy.get(ALERTS_COUNT).should('have.text', `${expectedNumberOfAlerts} alerts`);
          checkCountsFromAlertsTrendHistogram(expectedNumberOfAlerts);

          goToAcknowledgedAlerts();
          waitForAlerts();

          cy.get(ALERTS_COUNT).should('have.text', `${numberOfAlertsToBeMarkedAcknowledged} alert`);
          checkCountsFromAlertsTrendHistogram(numberOfAlertsToBeMarkedAcknowledged);
        });
    });
  });
});
