/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getNewRule } from '../../objects/rule';
import {
  NUMBER_OF_ALERTS,
  HOST_RISK_HEADER_COLIMN,
  USER_RISK_HEADER_COLIMN,
  HOST_RISK_COLUMN,
  USER_RISK_COLUMN,
  ACTION_COLUMN,
} from '../../screens/alerts';
import { ENRICHED_DATA_ROW } from '../../screens/alerts_details';
import { esArchiverLoad, esArchiverUnload } from '../../tasks/es_archiver';

import { createCustomRuleEnabled } from '../../tasks/api_calls/rules';
import { cleanKibana, deleteAlertsAndRules } from '../../tasks/common';
import { waitForAlertsToPopulate } from '../../tasks/create_new_rule';
import {
  expandFirstAlert,
  scrollAlertTableColumnIntoView,
  closeAlertFlyout,
} from '../../tasks/alerts';

import { login, visit } from '../../tasks/login';

import { ALERTS_URL } from '../../urls/navigation';

describe.skip('Enrichment', () => {
  before(() => {
    cleanKibana();
    esArchiverLoad('risky_users');
    login();
  });

  after(() => {
    esArchiverUnload('risky_users');
  });

  describe('Custom query rule', () => {
    beforeEach(() => {
      esArchiverLoad('risky_hosts');
      deleteAlertsAndRules();
      createCustomRuleEnabled(getNewRule(), 'rule1');
      visit(ALERTS_URL);
      waitForAlertsToPopulate();
    });

    afterEach(() => {
      esArchiverUnload('risky_hosts');
      esArchiverUnload('risky_hosts_updated');
    });

    it('Should has enrichment fields', function () {
      cy.get(NUMBER_OF_ALERTS)
        .invoke('text')
        .should('match', /^[1-9].+$/); // Any number of alerts
      cy.get(HOST_RISK_HEADER_COLIMN).contains('host.risk.calculated_level');
      cy.get(USER_RISK_HEADER_COLIMN).contains('user.risk.calculated_level');
      scrollAlertTableColumnIntoView(HOST_RISK_COLUMN);
      cy.get(HOST_RISK_COLUMN).contains('Low');
      scrollAlertTableColumnIntoView(USER_RISK_COLUMN);
      cy.get(USER_RISK_COLUMN).contains('Low');
      scrollAlertTableColumnIntoView(ACTION_COLUMN);
      expandFirstAlert();
      cy.get(ENRICHED_DATA_ROW).contains('Low');
      cy.get(ENRICHED_DATA_ROW).contains('Current host risk classification');
      cy.get(ENRICHED_DATA_ROW).contains('Critical').should('not.exist');
      cy.get(ENRICHED_DATA_ROW).contains('Original host risk classification').should('not.exist');

      closeAlertFlyout();
      esArchiverUnload('risky_hosts');
      esArchiverLoad('risky_hosts_updated');
      expandFirstAlert();
      cy.get(ENRICHED_DATA_ROW).contains('Critical');
      cy.get(ENRICHED_DATA_ROW).contains('Original host risk classification');
    });
  });
});
