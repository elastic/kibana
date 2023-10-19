/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loadPage } from '../../tasks/common';
import { closeAllToasts } from '../../tasks/toasts';
import {
  addAlertToCase,
  getAlertsTableRows,
  openAlertDetailsView,
  openResponderFromEndpointAlertDetails,
} from '../../screens/alerts';
import { ensureOnResponder } from '../../screens/responder';
import { cleanupCase, cleanupRule, loadCase, loadRule } from '../../tasks/api_fixtures';
import { waitForEndpointListPageToBeLoaded } from '../../tasks/response_console';
import { openCaseAlertDetails, toggleRuleOffAndOn, visitRuleAlerts } from '../../tasks/isolate';

import { login } from '../../tasks/login';
import { APP_CASES_PATH } from '../../../../../common/constants';

describe('Response console', { tags: ['@ess', '@serverless', '@brokenInServerless'] }, () => {
  before(() => {
    cy.createEndpointHost();
  });

  after(() => {
    cy.removeEndpointHost();
  });

  beforeEach(() => {
    login();
  });

  describe('From Cases', () => {
    let ruleId: string;
    let ruleName: string;
    let caseId: string;
    const caseOwner = 'securitySolution';

    beforeEach(() => {
      cy.getCreatedHostData()
        .then((hostData) =>
          loadRule(
            { query: `agent.name: ${hostData.createdHost.hostname} and agent.type: endpoint` },
            false
          )
        )
        .then((data) => {
          ruleId = data.id;
          ruleName = data.name;
        });
      loadCase(caseOwner).then((data) => {
        caseId = data.id;
      });
    });

    afterEach(() => {
      if (ruleId) {
        cleanupRule(ruleId);
      }
      if (caseId) {
        cleanupCase(caseId);
      }
    });

    it('should open responder', () => {
      waitForEndpointListPageToBeLoaded();
      toggleRuleOffAndOn(ruleName);
      visitRuleAlerts(ruleName);
      closeAllToasts();

      getAlertsTableRows().should('have.length.greaterThan', 0);
      openAlertDetailsView();
      addAlertToCase(caseId, caseOwner);

      // visit case details page
      cy.intercept('GET', `/api/cases/${caseId}/user_actions/_find*`).as('case');
      loadPage(`${APP_CASES_PATH}/${caseId}`);

      cy.wait('@case', { timeout: 30000 }).then(({ response: res }) => {
        const caseAlertId = res?.body.userActions[1].id;
        closeAllToasts();
        openCaseAlertDetails(caseAlertId);
      });

      openResponderFromEndpointAlertDetails();
      ensureOnResponder();
    });
  });
});
