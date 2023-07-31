/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PolicyData } from '../../../../../common/endpoint/types';
import type { CreateAndEnrollEndpointHostResponse } from '../../../../../scripts/endpoint/common/endpoint_host_services';
import {
  inputConsoleCommand,
  openResponseConsoleFromEndpointList,
  performCommandInputChecks,
  submitCommand,
  waitForCommandToBeExecuted,
  waitForEndpointListPageToBeLoaded,
} from '../../tasks/response_console';
import type { IndexedFleetEndpointPolicyResponse } from '../../../../../common/endpoint/data_loaders/index_fleet_endpoint_policy';
import { getEndpointIntegrationVersion, createAgentPolicyTask } from '../../tasks/fleet';
import {
  checkEndpointListForOnlyIsolatedHosts,
  checkEndpointListForOnlyUnIsolatedHosts,
} from '../../tasks/isolate';

import { login } from '../../tasks/login';
import { enableAllPolicyProtections } from '../../tasks/endpoint_policy';
import { createEndpointHost } from '../../tasks/create_endpoint_host';
import { deleteAllLoadedEndpointData } from '../../tasks/delete_all_endpoint_data';

describe('Response console', () => {
  beforeEach(() => {
    login();
  });

  describe('User journey for Isolate command: isolate and release an endpoint', () => {
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

    it('should isolate host from response console', () => {
      const command = 'isolate';
      waitForEndpointListPageToBeLoaded(createdHost.hostname);
      checkEndpointListForOnlyUnIsolatedHosts();
      openResponseConsoleFromEndpointList();
      performCommandInputChecks(command);
      submitCommand();
      waitForCommandToBeExecuted(command);
      waitForEndpointListPageToBeLoaded(createdHost.hostname);
      checkEndpointListForOnlyIsolatedHosts();
    });

    it('should release host from response console', () => {
      const command = 'release';
      waitForEndpointListPageToBeLoaded(createdHost.hostname);
      checkEndpointListForOnlyIsolatedHosts();
      openResponseConsoleFromEndpointList();
      performCommandInputChecks(command);
      submitCommand();
      waitForCommandToBeExecuted(command);
      waitForEndpointListPageToBeLoaded(createdHost.hostname);
      checkEndpointListForOnlyUnIsolatedHosts();
    });
  });

  describe('User journey for Processes operations: list, kill and suspend process', () => {
    let cronPID: string;
    let newCronPID: string;

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

    it('"processes" - should obtain a list of processes', () => {
      waitForEndpointListPageToBeLoaded(createdHost.hostname);
      openResponseConsoleFromEndpointList();
      performCommandInputChecks('processes');
      submitCommand();
      cy.contains('Action pending.').should('exist');
      cy.getByTestSubj('getProcessesSuccessCallout', { timeout: 120000 }).within(() => {
        ['USER', 'PID', 'ENTITY ID', 'COMMAND'].forEach((header) => {
          cy.contains(header);
        });

        cy.get('tbody > tr').should('have.length.greaterThan', 0);
        cy.get('tbody > tr > td').should('contain', '/usr/sbin/cron');
        cy.get('tbody > tr > td')
          .contains('/usr/sbin/cron')
          .parents('td')
          .siblings('td')
          .eq(1)
          .find('span')
          .then((span) => {
            cronPID = span.text();
          });
      });
    });

    it('"kill-process --pid" - should kill a process', () => {
      waitForEndpointListPageToBeLoaded(createdHost.hostname);
      openResponseConsoleFromEndpointList();
      inputConsoleCommand(`kill-process --pid ${cronPID}`);
      submitCommand();
      waitForCommandToBeExecuted('kill-process');

      performCommandInputChecks('processes');
      submitCommand();

      cy.getByTestSubj('getProcessesSuccessCallout', { timeout: 120000 }).within(() => {
        cy.get('tbody > tr > td')
          .contains('/usr/sbin/cron')
          .parents('td')
          .siblings('td')
          .eq(1)
          .find('span')
          .then((span) => {
            newCronPID = span.text();
          });
      });
      expect(newCronPID).to.not.equal(cronPID);
    });

    it('"suspend-process --pid" - should suspend a process', () => {
      waitForEndpointListPageToBeLoaded(createdHost.hostname);
      openResponseConsoleFromEndpointList();
      inputConsoleCommand(`suspend-process --pid ${newCronPID}`);
      submitCommand();
      waitForCommandToBeExecuted('suspend-process');
    });
  });

  // Broken until this is fixed: https://github.com/elastic/kibana/issues/162760
  describe.skip('File operations: get-file and execute', () => {
    const homeFilePath = process.env.CI || true ? '/home/vagrant' : `/home/ubuntu`;

    const fileContent = 'This is a test file for the get-file command.';
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

    it('"get-file --path" - should retrieve a file', () => {
      waitForEndpointListPageToBeLoaded(createdHost.hostname);
      cy.task('createFileOnEndpoint', {
        hostname: createdHost.hostname,
        path: filePath,
        content: fileContent,
      });
      openResponseConsoleFromEndpointList();
      inputConsoleCommand(`get-file --path ${filePath}`);
      submitCommand();
      cy.getByTestSubj('getFileSuccess', { timeout: 60000 }).within(() => {
        cy.contains('File retrieved from the host.');
        cy.contains('(ZIP file passcode: elastic)');
        cy.contains(
          'Files are periodically deleted to clear storage space. Download and save file locally if needed.'
        );
        cy.contains('Click here to download').click();
        const downloadsFolder = Cypress.config('downloadsFolder');
        cy.readFile(`${downloadsFolder}/upload.zip`);

        cy.task('uploadFileToEndpoint', {
          hostname: createdHost.hostname,
          srcPath: `${downloadsFolder}/upload.zip`,
          destPath: `${homeFilePath}/upload.zip`,
        });

        cy.task('readZippedFileContentOnEndpoint', {
          hostname: createdHost.hostname,
          path: `${homeFilePath}/upload.zip`,
          password: 'elastic',
        }).then((unzippedFileContent) => {
          expect(unzippedFileContent).to.equal(fileContent);
        });
      });
    });

    it('"execute --command" - should execute a command', () => {
      waitForEndpointListPageToBeLoaded(createdHost.hostname);
      openResponseConsoleFromEndpointList();
      inputConsoleCommand(`execute --command "ls -al ${homeFilePath}"`);
      submitCommand();
      waitForCommandToBeExecuted('execute');
    });
  });

  describe('document signing', () => {
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

    it('should fail if data tampered', () => {
      waitForEndpointListPageToBeLoaded(createdHost.hostname);
      checkEndpointListForOnlyUnIsolatedHosts();
      openResponseConsoleFromEndpointList();
      performCommandInputChecks('isolate');

      // stop host so that we ensure tamper happens before endpoint processes the action
      cy.task('stopEndpointHost', createdHost.hostname);
      // get action doc before we submit command so we know when the new action doc is indexed
      cy.task('getLatestActionDoc').then((previousActionDoc) => {
        submitCommand();
        cy.task('tamperActionDoc', previousActionDoc);
      });
      cy.task('startEndpointHost', createdHost.hostname);

      const actionValidationErrorMsg =
        'Fleet action response error: Failed to validate action signature; check Endpoint logs for details';
      cy.contains(actionValidationErrorMsg, { timeout: 120000 }).should('exist');
    });
  });
});
