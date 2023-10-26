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
  unenrollAgent,
  changeAgentPolicy,
} from '../../tasks/fleet';

import { login } from '../../tasks/login';
import { enableAllPolicyProtections } from '../../tasks/endpoint_policy';
import { createAndEnrollEndpointHost } from '../../tasks/create_endpoint_host';
import { deleteAllLoadedEndpointData } from '../../tasks/delete_all_endpoint_data';

describe('Unenroll agent from fleet changing agent policy', { tags: ['@ess'] }, () => {
  let indexedPolicy: IndexedFleetEndpointPolicyResponse;
  let policy: PolicyData;
  let indexedPolicyWithAgentTamperEnabled: IndexedFleetEndpointPolicyResponse;
  let policyWithAgentTamperProtectionEnabled: PolicyData;
  let secondIndexedPolicyWithAgentTamperEnabled: IndexedFleetEndpointPolicyResponse;
  let secondPolicyWithAgentTamperProtectionEnabled: PolicyData;

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
      createAgentPolicyTask(version).then((dataForProtectedPolicy) => {
        secondIndexedPolicyWithAgentTamperEnabled = dataForProtectedPolicy;
        secondPolicyWithAgentTamperProtectionEnabled =
          secondIndexedPolicyWithAgentTamperEnabled.integrationPolicies[0];

        return enableAgentTamperProtectionFeatureFlagInPolicy(
          secondIndexedPolicyWithAgentTamperEnabled.agentPolicies[0].id
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
      cy.task('deleteIndexedFleetEndpointPolicies', secondIndexedPolicyWithAgentTamperEnabled);
    }
  });

  describe('When agent tamper protection is disabled but then is switched to a policy with it enabled', () => {
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

    it('should unenroll from fleet without issues', () => {
      waitForEndpointListPageToBeLoaded(createdHost.hostname);
      // Change agent policy and wait for action to be completed
      changeAgentPolicy(
        createdHost.agentId,
        policyWithAgentTamperProtectionEnabled.policy_id,
        3
      ).then((hasChanged) => {
        expect(hasChanged).to.eql(true);
        unenrollAgent(createdHost.agentId).then((isUnenrolled) => {
          expect(isUnenrolled).to.eql(true);
        });
      });
    });
  });

  describe('When agent tamper protection is enabled but then is switched to a policy with it disabled', () => {
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

    it('should unenroll from fleet without issues', () => {
      waitForEndpointListPageToBeLoaded(createdHost.hostname);
      // Change agent policy and wait for action to be completed
      changeAgentPolicy(createdHost.agentId, policy.policy_id, 3).then((hasChanged) => {
        expect(hasChanged).to.eql(true);
        unenrollAgent(createdHost.agentId).then((isUnenrolled) => {
          expect(isUnenrolled).to.eql(true);
        });
      });
    });
  });

  describe('When agent tamper protection is enabled but then is switched to a policy with it also enabled', () => {
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

    it('should unenroll from fleet without issues', () => {
      waitForEndpointListPageToBeLoaded(createdHost.hostname);
      // Change agent policy and wait for action to be completed
      changeAgentPolicy(
        createdHost.agentId,
        secondPolicyWithAgentTamperProtectionEnabled.policy_id,
        3
      ).then((hasChanged) => {
        expect(hasChanged).to.eql(true);
        unenrollAgent(createdHost.agentId).then((isUnenrolled) => {
          expect(isUnenrolled).to.eql(true);
        });
      });
    });
  });
});
