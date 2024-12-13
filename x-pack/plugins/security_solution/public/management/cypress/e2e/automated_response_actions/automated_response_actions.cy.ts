/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { waitForAlertsToPopulate } from '@kbn/test-suites-xpack/security_solution_cypress/cypress/tasks/create_new_rule';
import { login } from '../../tasks/login';
import { waitForEndpointListPageToBeLoaded } from '../../tasks/response_console';
import type { PolicyData } from '../../../../../common/endpoint/types';
import { closeAllToasts } from '../../tasks/toasts';
import { toggleRuleOffAndOn, visitRuleAlerts } from '../../tasks/isolate';
import { cleanupRule, loadRule } from '../../tasks/api_fixtures';
import type { IndexedFleetEndpointPolicyResponse } from '../../../../../common/endpoint/data_loaders/index_fleet_endpoint_policy';
import { createAgentPolicyTask, getEndpointIntegrationVersion } from '../../tasks/fleet';
import { changeAlertsFilter } from '../../tasks/alerts';
import type { CreateAndEnrollEndpointHostResponse } from '../../../../../scripts/endpoint/common/endpoint_host_services';
import { createEndpointHost } from '../../tasks/create_endpoint_host';
import { deleteAllLoadedEndpointData } from '../../tasks/delete_all_endpoint_data';
import { enableAllPolicyProtections } from '../../tasks/endpoint_policy';

describe(
  'Automated Response Actions',
  {
    tags: ['@ess', '@serverless'],
    env: {
      ftrConfig: {
        kbnServerArgs: [
          `--xpack.securitySolution.enableExperimental=${JSON.stringify([
            'automatedProcessActionsEnabled',
          ])}`,
        ],
      },
    },
  },
  () => {
    let indexedPolicy: IndexedFleetEndpointPolicyResponse;
    let policy: PolicyData;
    let createdHost: CreateAndEnrollEndpointHostResponse;
    let ruleId: string;
    let ruleName: string;
    beforeEach(() => {
      login();
    });

    before(() => {
      getEndpointIntegrationVersion()
        .then((version) =>
          createAgentPolicyTask(version, 'automated_response_actions').then((data) => {
            indexedPolicy = data;
            policy = indexedPolicy.integrationPolicies[0];

            return enableAllPolicyProtections(policy.id).then(() => {
              // Create and enroll a new Endpoint host
              return createEndpointHost(policy.policy_ids[0]).then((host) => {
                createdHost = host as CreateAndEnrollEndpointHostResponse;
              });
            });
          })
        )
        .then(() => {
          loadRule().then((data) => {
            ruleId = data.id;
            ruleName = data.name;
          });
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
    });

    it('should have been called against a created host', () => {
      waitForEndpointListPageToBeLoaded(createdHost.hostname);
      toggleRuleOffAndOn(ruleName);

      visitRuleAlerts(ruleName);
      closeAllToasts();

      changeAlertsFilter(`process.name: "agentbeat" and agent.id: "${createdHost.agentId}"`);
      waitForAlertsToPopulate();

      cy.getByTestSubj('expand-event').first().click();
      cy.getByTestSubj('securitySolutionFlyoutNavigationExpandDetailButton').click();
      cy.getByTestSubj('securitySolutionFlyoutResponseTab').click();

      cy.contains(/isolate is pending|isolate completed successfully/g);
      cy.contains(/kill-process is pending|kill-process completed successfully/g);
      cy.contains('The action was called with a non-existing event field name: entity_id');
    });
  }
);
