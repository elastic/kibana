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
  changeAgentPolicy,
  isAgentAndEndpointUninstalledFromHost,
  uninstallAgentFromHost,
} from '../../tasks/fleet';

import { login } from '../../tasks/login';
import { enableAllPolicyProtections } from '../../tasks/endpoint_policy';
import { createAndEnrollEndpointHost } from '../../tasks/create_endpoint_host';
import { deleteAllLoadedEndpointData } from '../../tasks/delete_all_endpoint_data';

describe('Uninstall agent from host changing agent policy', { tags: ['@ess'] }, () => {
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

    it('should uninstall from host without issues', () => {
      waitForEndpointListPageToBeLoaded(createdHost.hostname);

      // Change agent policy and wait for action to be completed
      changeAgentPolicy(
        createdHost.agentId,
        policyWithAgentTamperProtectionEnabled.policy_id,
        3
      ).then((hasChanged) => {
        expect(hasChanged).to.eql(true);

        // Try to uninstall agent from host without the uninstall token
        uninstallAgentFromHost(createdHost.hostname).then((responseWithoutToken) => {
          expect(responseWithoutToken).to.match(/(.*)Invalid uninstall token(.*)/);
          expect(responseWithoutToken).to.not.match(/(.*)Elastic Agent has been uninstalled(.*)/);
          isAgentAndEndpointUninstalledFromHost(createdHost.hostname).then(
            (isUninstalledWithoutToken) => {
              expect(isUninstalledWithoutToken).to.eql(false);

              // Get the uninstall token from that agent policy
              getUninstallToken(policyWithAgentTamperProtectionEnabled.policy_id).then(
                (uninstallToken) => {
                  // Try to uninstall agent from host using the retrieved uninstall token
                  uninstallAgentFromHost(createdHost.hostname, uninstallToken.body.item.token).then(
                    (responseWithToken) => {
                      expect(responseWithToken).to.not.match(/(.*)Invalid uninstall token(.*)/);
                      expect(responseWithToken).to.match(
                        /(.*)Elastic Agent has been uninstalled(.*)/
                      );

                      isAgentAndEndpointUninstalledFromHost(createdHost.hostname).then(
                        (isUninstalledWithToken) => {
                          expect(isUninstalledWithToken).to.eql(true);
                        }
                      );
                    }
                  );
                }
              );
            }
          );
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

    it('should uninstall from host without issues', () => {
      waitForEndpointListPageToBeLoaded(createdHost.hostname);

      changeAgentPolicy(createdHost.agentId, policy.policy_id, 3).then((hasChanged) => {
        expect(hasChanged).to.eql(true);
        uninstallAgentFromHost(createdHost.hostname).then((responseWithoutToken) => {
          expect(responseWithoutToken).to.not.match(/(.*)Invalid uninstall token(.*)/);
          expect(responseWithoutToken).to.match(/(.*)Elastic Agent has been uninstalled(.*)/);
          isAgentAndEndpointUninstalledFromHost(createdHost.hostname).then(
            (isUninstalledWithoutToken) => {
              expect(isUninstalledWithoutToken).to.eql(true);
            }
          );
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

    it('should uninstall from host without issues', () => {
      waitForEndpointListPageToBeLoaded(createdHost.hostname);

      // Change agent policy and wait for action to be completed
      changeAgentPolicy(
        createdHost.agentId,
        secondPolicyWithAgentTamperProtectionEnabled.policy_id,
        3
      ).then((hasChanged) => {
        expect(hasChanged).to.eql(true);

        // Get the uninstall token from old agent policy
        getUninstallToken(policyWithAgentTamperProtectionEnabled.policy_id).then(
          (oldUninstallToken) => {
            // Try to uninstall agent from host using old retrieved uninstall token
            uninstallAgentFromHost(createdHost.hostname, oldUninstallToken.body.item.token).then(
              (responseWithOldToken) => {
                expect(responseWithOldToken).to.match(/(.*)Invalid uninstall token(.*)/);
                expect(responseWithOldToken).to.not.match(
                  /(.*)Elastic Agent has been uninstalled(.*)/
                );

                isAgentAndEndpointUninstalledFromHost(createdHost.hostname).then(
                  (isUninstalledWithOldToken) => {
                    expect(isUninstalledWithOldToken).to.eql(false);

                    // Get the uninstall token from new agent policy
                    getUninstallToken(secondPolicyWithAgentTamperProtectionEnabled.policy_id).then(
                      (newUninstallToken) => {
                        // Try to uninstall agent from host using new retrieved uninstall token
                        uninstallAgentFromHost(
                          createdHost.hostname,
                          newUninstallToken.body.item.token
                        ).then((responseWithNewToken) => {
                          expect(responseWithNewToken).to.not.match(
                            /(.*)Invalid uninstall token(.*)/
                          );
                          expect(responseWithNewToken).to.match(
                            /(.*)Elastic Agent has been uninstalled(.*)/
                          );

                          isAgentAndEndpointUninstalledFromHost(createdHost.hostname).then(
                            (isUninstalledWithNewToken) => {
                              expect(isUninstalledWithNewToken).to.eql(true);
                            }
                          );
                        });
                      }
                    );
                  }
                );
              }
            );
          }
        );
      });
    });
  });
});
