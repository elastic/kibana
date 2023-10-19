/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { APP_ENDPOINTS_PATH } from '../../../../../common/constants';
import { closeAllToasts } from '../../tasks/toasts';
import { toggleRuleOffAndOn, visitRuleAlerts } from '../../tasks/isolate';
import { cleanupRule, loadRule } from '../../tasks/api_fixtures';
import { login } from '../../tasks/login';
import { disableExpandableFlyoutAdvancedSettings, loadPage } from '../../tasks/common';
import { changeAlertsFilter } from '../../tasks/alerts';

// FLAKY: https://github.com/elastic/kibana/issues/168340
describe.skip(
  'Automated Response Actions',
  { tags: ['@ess', '@serverless', '@brokenInServerless'] },
  () => {
    before(() => {
      cy.createEndpointHost();
    });

    after(() => {
      cy.removeEndpointHost();
    });

    const hostname = new URL(Cypress.env('FLEET_SERVER_URL')).port;
    const fleetHostname = `dev-fleet-server.${hostname}`;

    beforeEach(() => {
      login();
      disableExpandableFlyoutAdvancedSettings();
    });

    // FLAKY: https://github.com/elastic/kibana/issues/168427
    describe.skip('From alerts', () => {
      let ruleId: string;
      let ruleName: string;

      before(() => {
        loadRule().then((data) => {
          ruleId = data.id;
          ruleName = data.name;
        });
      });

      after(() => {
        if (ruleId) {
          cleanupRule(ruleId);
        }
      });

      it('should have generated endpoint and rule', () => {
        loadPage(APP_ENDPOINTS_PATH);
        cy.getCreatedHostData().then((hostData) =>
          cy.contains(hostData.createdHost.hostname).should('exist')
        );

        toggleRuleOffAndOn(ruleName);

        visitRuleAlerts(ruleName);
        closeAllToasts();

        changeAlertsFilter('event.category: "file"');
        cy.getByTestSubj('expand-event').first().click();
        cy.getByTestSubj('responseActionsViewTab').click();
        cy.getByTestSubj('response-actions-notification').should('not.have.text', '0');

        cy.getCreatedHostData().then((hostData) =>
          cy
            .getByTestSubj(`response-results-${hostData.createdHost.hostname}-details-tray`)
            .should('contain', 'isolate completed successfully')
            .and('contain', hostData.createdHost.hostname)
        );

        cy.getByTestSubj(`response-results-${fleetHostname}-details-tray`)
          .should('contain', 'The host does not have Elastic Defend integration installed')
          .and('contain', 'dev-fleet-server');
      });
    });
  }
);
