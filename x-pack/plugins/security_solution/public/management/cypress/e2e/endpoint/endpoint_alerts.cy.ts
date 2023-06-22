/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { deleteAllLoadedEndpointData } from '../../tasks/delete_all_endpoint_data';
import { getAlertsTableRows, navigateToAlertsList } from '../../screens/alerts';
import { waitForEndpointAlerts } from '../../tasks/alerts';
import { request } from '../../tasks/common';
import { getEndpointIntegrationVersion } from '../../tasks/fleet';
import type { IndexedFleetEndpointPolicyResponse } from '../../../../../common/endpoint/data_loaders/index_fleet_endpoint_policy';
import { enableAllPolicyProtections } from '../../tasks/endpoint_policy';
import type { PolicyData, ResponseActionApiResponse } from '../../../../../common/endpoint/types';
import type { CreateAndEnrollEndpointHostResponse } from '../../../../../scripts/endpoint/common/endpoint_host_services';
import { login } from '../../tasks/login';
import { EXECUTE_ROUTE } from '../../../../../common/endpoint/constants';
import { waitForActionToComplete } from '../../tasks/response_actions';

describe('Endpoint generated alerts', () => {
  let indexedPolicy: IndexedFleetEndpointPolicyResponse;
  let policy: PolicyData;
  let createdHost: CreateAndEnrollEndpointHostResponse;

  before(() => {
    getEndpointIntegrationVersion().then((version) => {
      const policyName = `alerts test ${Math.random().toString(36).substring(2, 7)}`;

      cy.task<IndexedFleetEndpointPolicyResponse>('indexFleetEndpointPolicy', {
        policyName,
        endpointPackageVersion: version,
        agentPolicyName: policyName,
      }).then((data) => {
        indexedPolicy = data;
        policy = indexedPolicy.integrationPolicies[0];

        return enableAllPolicyProtections(policy.id).then(() => {
          // Create and enroll a new Endpoint host
          return cy
            .task(
              'createEndpointHost',
              {
                agentPolicyId: policy.policy_id,
              },
              { timeout: 180000 }
            )
            .then((host) => {
              createdHost = host as CreateAndEnrollEndpointHostResponse;
            });
        });
      });
    });
  });

  after(() => {
    if (createdHost) {
      cy.task('destroyEndpointHost', createdHost).then(() => {});
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

  it('should create a Detection Engine alert from an endpoint alert', () => {
    // Triggers a Malicious Behaviour alert on Linux system (`grep *` was added only to identify this specific alert)
    const executeMaliciousCommand = `bash -c cat /dev/tcp/foo | grep ${Math.random()
      .toString(16)
      .substring(2)}`;

    // Send `execute` command that triggers malicious behaviour using the `execute` response action
    request<ResponseActionApiResponse>({
      method: 'POST',
      url: EXECUTE_ROUTE,
      body: {
        endpoint_ids: [createdHost.agentId],
        parameters: {
          command: executeMaliciousCommand,
        },
      },
    })
      .then((response) => waitForActionToComplete(response.body.data.id))
      .then(() => {
        return waitForEndpointAlerts(createdHost.agentId, [
          {
            term: { 'process.group_leader.args': executeMaliciousCommand },
          },
        ]);
      })
      .then(() => {
        return navigateToAlertsList(
          `query=(language:kuery,query:'agent.id: "${createdHost.agentId}" ')`
        );
      });

    getAlertsTableRows().should('have.length.greaterThan', 0);
  });
});
