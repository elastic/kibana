/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getRunningProcesses } from '../../../tasks/response_actions';
import type { PolicyData } from '../../../../../../common/endpoint/types';
import type { CreateAndEnrollEndpointHostResponse } from '../../../../../../scripts/endpoint/common/endpoint_host_services';
import {
  inputConsoleCommand,
  openResponseConsoleFromEndpointList,
  performCommandInputChecks,
  submitCommand,
  waitForCommandToBeExecuted,
  waitForEndpointListPageToBeLoaded,
} from '../../../tasks/response_console';
import type { IndexedFleetEndpointPolicyResponse } from '../../../../../../common/endpoint/data_loaders/index_fleet_endpoint_policy';
import { createAgentPolicyTask, getEndpointIntegrationVersion } from '../../../tasks/fleet';

import { login } from '../../../tasks/login';
import { enableAllPolicyProtections } from '../../../tasks/endpoint_policy';
import { createEndpointHost } from '../../../tasks/create_endpoint_host';
import { deleteAllLoadedEndpointData } from '../../../tasks/delete_all_endpoint_data';

const AGENT_BEAT_FILE_PATH_SUFFIX = '/components/agentbeat';

// FLAKY: https://github.com/elastic/kibana/issues/170370
// FLAKY: https://github.com/elastic/kibana/issues/170371
describe.skip('Response console', { tags: ['@ess', '@serverless', '@skipInServerlessMKI'] }, () => {
  beforeEach(() => {
    login();
  });

  describe('Processes operations:', () => {
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

    it('"processes" - should obtain a list of processes', () => {
      waitForEndpointListPageToBeLoaded(createdHost.hostname);
      openResponseConsoleFromEndpointList();

      // get running processes
      performCommandInputChecks('processes');
      submitCommand();
      cy.contains('Action pending.').should('exist');

      // on success
      cy.getByTestSubj('processesOutput-processListTable', { timeout: 120000 }).within(() => {
        ['USER', 'PID', 'ENTITY ID', 'COMMAND'].forEach((header) => {
          cy.contains(header);
        });

        cy.get('tbody > tr').should('have.length.greaterThan', 0);
        cy.get('tbody > tr > td').should('contain', AGENT_BEAT_FILE_PATH_SUFFIX);
      });
    });

    it('"kill-process --pid" - should kill a process', () => {
      waitForEndpointListPageToBeLoaded(createdHost.hostname);
      openResponseConsoleFromEndpointList();

      // get running processes
      getRunningProcesses(AGENT_BEAT_FILE_PATH_SUFFIX).then((pid) => {
        // kill the process using PID
        inputConsoleCommand(`kill-process --pid ${pid}`);
        submitCommand();
        waitForCommandToBeExecuted('kill-process');
      });
    });

    it('"suspend-process --pid" - should suspend a process', () => {
      waitForEndpointListPageToBeLoaded(createdHost.hostname);
      openResponseConsoleFromEndpointList();

      // get running processes
      getRunningProcesses(AGENT_BEAT_FILE_PATH_SUFFIX).then((pid) => {
        // suspend the process using PID
        inputConsoleCommand(`suspend-process --pid ${pid}`);
        submitCommand();
        waitForCommandToBeExecuted('suspend-process');
      });
    });
  });
});
