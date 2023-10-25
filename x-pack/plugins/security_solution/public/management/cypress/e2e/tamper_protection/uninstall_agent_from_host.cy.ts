/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PolicyData } from '../../../../../common/endpoint/types';
import type { CreateAndEnrollEndpointHostResponse } from '../../../../../scripts/endpoint/common/endpoint_host_services';
import { waitForEndpointListPageToBeLoaded } from '../../tasks/response_console';
import type { IndexedFleetEndpointPolicyResponse } from '../../../../../common/endpoint/data_loaders/index_fleet_endpoint_policy';
import {
  getEndpointIntegrationVersion,
  createAgentPolicyTask,
  enableAgentTamperProtectionFeatureFlagInPolicy,
  getUninstallToken,
  isAgentAndEndpointUninstalledFromHost,
  uninstallAgentFromHost,
} from '../../tasks/fleet';

import { login } from '../../tasks/login';
import { enableAllPolicyProtections } from '../../tasks/endpoint_policy';
import { createAndEnrollEndpointHost } from '../../tasks/create_endpoint_host';
import { deleteAllLoadedEndpointData } from '../../tasks/delete_all_endpoint_data';

describe('Uninstall agent from host', { tags: ['@ess'] }, () => {
  let indexedPolicy: IndexedFleetEndpointPolicyResponse;
  let policy: PolicyData;
  let indexedPolicyWithAgentTamperEnabled: IndexedFleetEndpointPolicyResponse;
  let policyWithAgentTamperProtectionEnabled: PolicyData;

  before(() => {
    getEndpointIntegrationVersion().then((version) => {
      createAgentPolicyTask(version).then((data) => {
        indexedPolicy = data;
        policy = indexedPolicy.integrationPolicies[0];
        return enableAllPolicyProtections(policy.id);
      });
      createAgentPolicyTask(version).then((dataForProtectedPolicy) => {
        indexedPolicyWithAgentTamperEnabled = dataForProtectedPolicy;
        policyWithAgentTamperProtectionEnabled =
          indexedPolicyWithAgentTamperEnabled.integrationPolicies[0];

        return enableAgentTamperProtectionFeatureFlagInPolicy(
          indexedPolicyWithAgentTamperEnabled.agentPolicies[0].id
        );
      });
    });
  });
  beforeEach(() => {
    login();
  });

  after(() => {
    if (indexedPolicy) {
      cy.task('deleteIndexedFleetEndpointPolicies', indexedPolicy);
      cy.task('deleteIndexedFleetEndpointPolicies', indexedPolicyWithAgentTamperEnabled);
    }
  });

  describe('When agent tamper protection is disabled', () => {
    let createdHost: CreateAndEnrollEndpointHostResponse;

    beforeEach(() => {
      // Create and enroll a new Endpoint host
      return createAndEnrollEndpointHost(policy.policy_id).then((host) => {
        createdHost = host as CreateAndEnrollEndpointHostResponse;
      });
    });

    afterEach(() => {
      if (createdHost) {
        cy.task('destroyEndpointHost', createdHost);
      }

      if (createdHost) {
        deleteAllLoadedEndpointData({ endpointAgentIds: [createdHost.agentId] });
      }
    });

    it('should uninstall from host without issues', () => {
      waitForEndpointListPageToBeLoaded(createdHost.hostname);
      uninstallAgentFromHost(createdHost.hostname).then((response) => {
        expect(response).to.not.match(/(.*)Invalid uninstall token(.*)/);
        expect(response).to.match(/(.*)Elastic Agent has been uninstalled(.*)/);
        isAgentAndEndpointUninstalledFromHost(createdHost.hostname).then((isUninstalled) => {
          expect(isUninstalled).to.eql(true);
        });
      });
    });
  });

  describe('When agent tamper protection is enabled', () => {
    let createdHost: CreateAndEnrollEndpointHostResponse;

    beforeEach(() => {
      // Create and enroll a new Endpoint host
      return createAndEnrollEndpointHost(policyWithAgentTamperProtectionEnabled.policy_id).then(
        (host) => {
          createdHost = host as CreateAndEnrollEndpointHostResponse;
        }
      );
    });

    afterEach(() => {
      if (createdHost) {
        cy.task('destroyEndpointHost', createdHost);
      }

      if (createdHost) {
        deleteAllLoadedEndpointData({ endpointAgentIds: [createdHost.agentId] });
      }
    });

    it('should not uninstall from host without the uninstall token', () => {
      waitForEndpointListPageToBeLoaded(createdHost.hostname);
      uninstallAgentFromHost(createdHost.hostname).then((response) => {
        expect(response).to.match(/(.*)Invalid uninstall token(.*)/);
        expect(response).to.not.match(/(.*)Elastic Agent has been uninstalled(.*)/);
        isAgentAndEndpointUninstalledFromHost(createdHost.hostname).then((isUninstalled) => {
          expect(isUninstalled).to.eql(false);
        });
      });
    });

    it('should uninstall from host with the uninstall token', () => {
      waitForEndpointListPageToBeLoaded(createdHost.hostname);
      getUninstallToken(policyWithAgentTamperProtectionEnabled.policy_id).then((uninstallToken) => {
        uninstallAgentFromHost(createdHost.hostname, uninstallToken.body.item.token).then(
          (response) => {
            expect(response).to.not.match(/(.*)Invalid uninstall token(.*)/);
            expect(response).to.match(/(.*)Elastic Agent has been uninstalled(.*)/);

            isAgentAndEndpointUninstalledFromHost(createdHost.hostname).then((isUninstalled) => {
              expect(isUninstalled).to.eql(true);
            });
          }
        );
      });
    });
  });
});
