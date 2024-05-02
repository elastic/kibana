/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PolicyData } from '../../../../../common/endpoint/types';
import { APP_ENDPOINTS_PATH } from '../../../../../common/constants';
import { closeAllToasts } from '../../tasks/toasts';
import { toggleRuleOffAndOn, visitRuleAlerts } from '../../tasks/isolate';
import { cleanupRule, loadRule } from '../../tasks/api_fixtures';
import { login } from '../../tasks/login';
import { loadPage } from '../../tasks/common';
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

    before(() => {
      getEndpointIntegrationVersion().then((version) =>
        createAgentPolicyTask(version, 'automated_response_actions').then((data) => {
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
    });

    beforeEach(() => {
      login();
    });

    // FLAKY: https://github.com/elastic/kibana/issues/169828
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
        cy.contains(createdHost.hostname).should('exist');

        toggleRuleOffAndOn(ruleName);

        visitRuleAlerts(ruleName);
        closeAllToasts();

        changeAlertsFilter('process.name: "sshd"');
        cy.getByTestSubj('expand-event').eq(0).click();
        cy.getByTestSubj('securitySolutionFlyoutNavigationExpandDetailButton').click();
        cy.getByTestSubj('securitySolutionFlyoutResponseTab').click();

        cy.contains(/isolate is pending|isolate completed successfully/g);
        cy.contains(/kill-process is pending|kill-process completed successfully/g);
        cy.contains('The action was called with a non-existing event field name: entity_id');
      });
    });
  }
);
