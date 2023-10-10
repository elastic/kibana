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
  openAlertDetailsView,
  openResponderFromEndpointAlertDetails,
  verifyResponderIsOpen,
} from '../../tasks/alert_details_actions';
import { cleanupCase, cleanupRule, loadCase, loadRule } from '../../tasks/api_fixtures';
import type { PolicyData } from '../../../../../common/endpoint/types';
import type { CreateAndEnrollEndpointHostResponse } from '../../../../../scripts/endpoint/common/endpoint_host_services';
import { waitForEndpointListPageToBeLoaded } from '../../tasks/response_console';
import type { IndexedFleetEndpointPolicyResponse } from '../../../../../common/endpoint/data_loaders/index_fleet_endpoint_policy';
import { createAgentPolicyTask, getEndpointIntegrationVersion } from '../../tasks/fleet';
import { openCaseAlertDetails, toggleRuleOffAndOn, visitRuleAlerts } from '../../tasks/isolate';

import { login } from '../../tasks/login';
import { enableAllPolicyProtections } from '../../tasks/endpoint_policy';
import { createEndpointHost } from '../../tasks/create_endpoint_host';
import { deleteAllLoadedEndpointData } from '../../tasks/delete_all_endpoint_data';
import { APP_CASES_PATH } from '../../../../../common/constants';

describe('Response console', { tags: ['@ess', '@serverless', '@brokenInServerless'] }, () => {
  beforeEach(() => {
    login();
  });

  describe('From Cases', () => {
    let indexedPolicy: IndexedFleetEndpointPolicyResponse;
    let policy: PolicyData;
    let createdHost: CreateAndEnrollEndpointHostResponse;
    let ruleId: string;
    let ruleName: string;
    let caseId: string;

    const caseOwner = 'securitySolution';

    before(() => {
      getEndpointIntegrationVersion().then((version) =>
        createAgentPolicyTask(version).then((data) => {
          indexedPolicy = data;
          policy = indexedPolicy.integrationPolicies[0];

          return enableAllPolicyProtections(policy.id).then(() => {
            // Create and enroll a new Endpoint host
            return createEndpointHost(policy.policy_id).then((host) => {
              createdHost = host as CreateAndEnrollEndpointHostResponse;
            });
          });
        })
      );

      loadRule(
        { query: `agent.name: ${createdHost.hostname} and agent.type: endpoint` },
        false
      ).then((data) => {
        ruleId = data.id;
        ruleName = data.name;
      });
      loadCase(caseOwner).then((data) => {
        caseId = data.id;
      });
    });

    after(() => {
      if (createdHost) {
        cy.task('destroyEndpointHost', createdHost);
      }

      if (indexedPolicy) {
        cy.task('deleteIndexedFleetEndpointPolicies', indexedPolicy);
      }

      if (createdHost) {
        deleteAllLoadedEndpointData({ endpointAgentIds: [createdHost.agentId] });
      }
      if (ruleId) {
        cleanupRule(ruleId);
      }
      if (caseId) {
        cleanupCase(caseId);
      }
    });

    it('should open responder', () => {
      waitForEndpointListPageToBeLoaded(createdHost.hostname);
      toggleRuleOffAndOn(ruleName);
      visitRuleAlerts(ruleName);
      closeAllToasts();
      openAlertDetailsView();
      addAlertToCase(caseId, caseOwner);

      // visit case details page
      cy.intercept('GET', `/api/cases/${caseId}/user_actions/_find*`).as('case');
      loadPage(`${APP_CASES_PATH}/${caseId}`);
      openCaseAlertDetails(caseId);

      cy.wait('@case', { timeout: 30000 }).then(({ response: res }) => {
        const caseAlertId = res?.body.userActions[1].id;

        closeAllToasts();
        openCaseAlertDetails(caseAlertId);
        openResponderFromEndpointAlertDetails();
        verifyResponderIsOpen();
      });
    });
  });
});
