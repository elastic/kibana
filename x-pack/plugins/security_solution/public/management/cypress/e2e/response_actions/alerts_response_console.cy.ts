/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { closeAllToasts } from '../../tasks/toasts';
import {
  getAlertsTableRows,
  openAlertDetailsView,
  openInvestigateInTimelineView,
  openResponderFromEndpointAlertDetails,
} from '../../screens/alerts';
import { ensureOnResponder } from '../../screens/responder';
import { cleanupRule, loadRule } from '../../tasks/api_fixtures';
import { waitForEndpointListPageToBeLoaded } from '../../tasks/response_console';
import { toggleRuleOffAndOn, visitRuleAlerts } from '../../tasks/isolate';

import { login } from '../../tasks/login';

describe('Response console', { tags: ['@ess', '@serverless', '@brokenInServerless'] }, () => {
  beforeEach(() => {
    login();
  });

  before(() => {
    cy.createEndpointHost();
  });

  after(() => {
    cy.removeEndpointHost();
  });

  describe('From Alerts', () => {
    let ruleId: string;
    let ruleName: string;

    before(() => {
      cy.getCreatedHostData()
        .then(({ createdHost }) =>
          loadRule({ query: `agent.name: ${createdHost.hostname} and agent.type: endpoint` }, false)
        )
        .then((data) => {
          ruleId = data.id;
          ruleName = data.name;
        });
    });

    after(() => {
      if (ruleId) {
        cleanupRule(ruleId);
      }
    });

    it('should open responder from alert details flyout', () => {
      cy.getCreatedHostData().then(({ createdHost }) => {
        waitForEndpointListPageToBeLoaded(createdHost.hostname);
      });
      toggleRuleOffAndOn(ruleName);
      visitRuleAlerts(ruleName);
      closeAllToasts();
      getAlertsTableRows().should('have.length.greaterThan', 0);
      openAlertDetailsView();

      openResponderFromEndpointAlertDetails();
      ensureOnResponder();
    });

    it('should open responder from timeline view alert details flyout', () => {
      cy.getCreatedHostData().then(({ createdHost }) => {
        waitForEndpointListPageToBeLoaded(createdHost.hostname);
      });
      toggleRuleOffAndOn(ruleName);
      visitRuleAlerts(ruleName);
      closeAllToasts();

      getAlertsTableRows().should('have.length.greaterThan', 0);
      openInvestigateInTimelineView();
      cy.getByTestSubj('timeline-flyout').within(() => {
        openAlertDetailsView();
      });
      openResponderFromEndpointAlertDetails();
      ensureOnResponder();
    });
  });
});
