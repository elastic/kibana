/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { PolicyData } from '../../../../../../common/endpoint/types';
import type { CreateAndEnrollEndpointHostResponse } from '../../../../../../scripts/endpoint/common/endpoint_host_services';
import {
  inputConsoleCommand,
  openResponseConsoleFromEndpointList,
  submitCommand,
  // waitForCommandToBeExecuted,
  waitForEndpointListPageToBeLoaded,
} from '../../../tasks/response_console';
import type { IndexedFleetEndpointPolicyResponse } from '../../../../../../common/endpoint/data_loaders/index_fleet_endpoint_policy';
import { createAgentPolicyTask, getEndpointIntegrationVersion } from '../../../tasks/fleet';

import { login } from '../../../tasks/login';
import { enableAllPolicyProtections } from '../../../tasks/endpoint_policy';
import { createEndpointHost } from '../../../tasks/create_endpoint_host';
import { deleteAllLoadedEndpointData } from '../../../tasks/delete_all_endpoint_data';

describe(
  'Response console',
  {
    env: {
      ftrConfig: {
        kbnServerArgs: [
          `--xpack.securitySolution.enableExperimental=${JSON.stringify([
            'responseActionScanEnabled',
          ])}`,
        ],
      },
    },
    tags: ['@ess', '@serverless'],
  },
  () => {
    beforeEach(() => {
      login();
    });

    describe('Scan operation:', () => {
      const homeFilePath = Cypress.env('IS_CI') ? '/home/vagrant' : '/home';

      const fileContent = 'This is a test file for the scan command.';
      const filePath = `${homeFilePath}/test_file.txt`;

      let indexedPolicy: IndexedFleetEndpointPolicyResponse;
      let policy: PolicyData;
      let createdHost: CreateAndEnrollEndpointHostResponse;

      before(() => {
        getEndpointIntegrationVersion().then((version) =>
          createAgentPolicyTask(version).then((data) => {
            indexedPolicy = data;
            policy = indexedPolicy.integrationPolicies[0];

            return enableAllPolicyProtections(policy.id).then(() => {
              // Create and enroll a new Endpoint host
              return createEndpointHost(policy.policy_ids[0]).then((host) => {
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

      it('"scan --path" - should scan a folder', () => {
        waitForEndpointListPageToBeLoaded(createdHost.hostname);
        cy.task('createFileOnEndpoint', {
          hostname: createdHost.hostname,
          path: filePath,
          content: fileContent,
        });

        // initiate get file action and wait for the API to complete
        cy.intercept('api/endpoint/action/scan').as('scanAction');
        openResponseConsoleFromEndpointList();
        inputConsoleCommand(`scan --path ${homeFilePath}`);
        submitCommand();
        cy.wait('@scanAction', { timeout: 60000 });

        cy.contains('Scan complete').click();
      });
    });
  }
);
