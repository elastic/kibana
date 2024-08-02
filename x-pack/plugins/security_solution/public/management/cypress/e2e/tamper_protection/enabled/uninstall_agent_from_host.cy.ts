/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PolicyData } from '../../../../../../common/endpoint/types';
import type { CreateAndEnrollEndpointHostResponse } from '../../../../../../scripts/endpoint/common/endpoint_host_services';
import { waitForEndpointListPageToBeLoaded } from '../../../tasks/response_console';
import type { IndexedFleetEndpointPolicyResponse } from '../../../../../../common/endpoint/data_loaders/index_fleet_endpoint_policy';
import {
  getEndpointIntegrationVersion,
  createAgentPolicyTask,
  enableAgentTamperProtectionFeatureFlagInPolicy,
  getUninstallToken,
  isAgentAndEndpointUninstalledFromHost,
  uninstallAgentFromHost,
} from '../../../tasks/fleet';

import { login } from '../../../tasks/login';
import { createEndpointHost } from '../../../tasks/create_endpoint_host';
import { deleteAllLoadedEndpointData } from '../../../tasks/delete_all_endpoint_data';

describe(
  'Uninstall agent from host when agent tamper protection is enabled',
  { tags: ['@ess'] },
  () => {
    let indexedPolicyWithAgentTamperEnabled: IndexedFleetEndpointPolicyResponse;
    let policyWithAgentTamperProtectionEnabled: PolicyData;
    let createdHost: CreateAndEnrollEndpointHostResponse;

    before(() => {
      getEndpointIntegrationVersion().then((version) => {
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
      // Create and enroll a new Endpoint host
      return createEndpointHost(policyWithAgentTamperProtectionEnabled.policy_ids[0]).then(
        (host) => {
          createdHost = host as CreateAndEnrollEndpointHostResponse;
        }
      );
    });

    after(() => {
      if (indexedPolicyWithAgentTamperEnabled) {
        cy.task('deleteIndexedFleetEndpointPolicies', indexedPolicyWithAgentTamperEnabled);
      }
    });

    afterEach(() => {
      if (createdHost) {
        cy.task('destroyEndpointHost', createdHost);
      }

      if (createdHost) {
        deleteAllLoadedEndpointData({ endpointAgentIds: [createdHost.agentId] });
      }
    });

    it('should uninstall from host with the uninstall token', () => {
      waitForEndpointListPageToBeLoaded(createdHost.hostname);
      uninstallAgentFromHost(createdHost.hostname).then((withoutUninstallTokenResponse) => {
        expect(withoutUninstallTokenResponse).to.match(/(.*)Invalid uninstall token(.*)/);
        expect(withoutUninstallTokenResponse).to.not.match(
          /(.*)Elastic Agent has been uninstalled(.*)/
        );
        isAgentAndEndpointUninstalledFromHost(createdHost.hostname).then(
          (isUninstalledWithoutUninstallToken) => {
            expect(isUninstalledWithoutUninstallToken).to.eql(false);
            getUninstallToken(policyWithAgentTamperProtectionEnabled.policy_ids[0]).then(
              (uninstallToken) => {
                uninstallAgentFromHost(createdHost.hostname, uninstallToken.body.item.token).then(
                  (withUninstallTokenResponse) => {
                    expect(withUninstallTokenResponse).to.not.match(
                      /(.*)Invalid uninstall token(.*)/
                    );
                    expect(withUninstallTokenResponse).to.match(
                      /(.*)Elastic Agent has been uninstalled(.*)/
                    );

                    isAgentAndEndpointUninstalledFromHost(createdHost.hostname).then(
                      (isUninstalledWithUninstallToken) => {
                        expect(isUninstalledWithUninstallToken).to.eql(true);
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
  }
);
