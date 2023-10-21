/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  inputConsoleCommand,
  openResponseConsoleFromEndpointList,
  performCommandInputChecks,
  submitCommand,
  waitForCommandToBeExecuted,
  waitForEndpointListPageToBeLoaded,
} from '../../tasks/response_console';
import {
  checkEndpointListForOnlyIsolatedHosts,
  checkEndpointListForOnlyUnIsolatedHosts,
} from '../../tasks/isolate';

import { login } from '../../tasks/login';

describe('Response console', { tags: ['@ess', '@serverless', '@brokenInServerless'] }, () => {
  before(() => {
    cy.createEndpointHost();
  });

  after(() => {
    cy.removeEndpointHost();
  });

  beforeEach(() => {
    login();
  });

  describe('User journey for Isolate command: isolate and release an endpoint', () => {
    it('should isolate host from response console', () => {
      const command = 'isolate';
      cy.getCreatedHostData().then((hostData) => {
        waitForEndpointListPageToBeLoaded(hostData.createdHost.hostname);
      });
      checkEndpointListForOnlyUnIsolatedHosts();
      openResponseConsoleFromEndpointList();
      performCommandInputChecks(command);
      submitCommand();
      waitForCommandToBeExecuted(command);
      cy.getCreatedHostData().then((hostData) => {
        waitForEndpointListPageToBeLoaded(hostData.createdHost.hostname);
      });
      checkEndpointListForOnlyIsolatedHosts();
    });

    it('should release host from response console', () => {
      const command = 'release';
      cy.getCreatedHostData().then((hostData) => {
        waitForEndpointListPageToBeLoaded(hostData.createdHost.hostname);
      });
      checkEndpointListForOnlyIsolatedHosts();
      openResponseConsoleFromEndpointList();
      performCommandInputChecks(command);
      submitCommand();
      waitForCommandToBeExecuted(command);
      cy.getCreatedHostData().then((hostData) => {
        waitForEndpointListPageToBeLoaded(hostData.createdHost.hostname);
      });
      checkEndpointListForOnlyUnIsolatedHosts();
    });
  });

  describe('User journey for Processes operations: list, kill and suspend process', () => {
    let cronPID: string;
    let newCronPID: string;

    it('"processes" - should obtain a list of processes', () => {
      cy.getCreatedHostData().then((hostData) => {
        waitForEndpointListPageToBeLoaded(hostData.createdHost.hostname);
      });
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
      cy.getCreatedHostData().then((hostData) => {
        waitForEndpointListPageToBeLoaded(hostData.createdHost.hostname);
      });
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
      cy.getCreatedHostData().then((hostData) => {
        waitForEndpointListPageToBeLoaded(hostData.createdHost.hostname);
      });
      openResponseConsoleFromEndpointList();
      inputConsoleCommand(`suspend-process --pid ${newCronPID}`);
      submitCommand();
      waitForCommandToBeExecuted('suspend-process');
    });
  });

  describe('File operations: get-file, upload and execute', () => {
    const homeFilePath = process.env.CI || true ? '/home/vagrant' : `/home/ubuntu`;

    const fileContent = 'This is a test file for the get-file command.';
    const filePath = `${homeFilePath}/test_file.txt`;

    it('"get-file --path" - should retrieve a file', () => {
      cy.getCreatedHostData().then((hostData) => {
        waitForEndpointListPageToBeLoaded(hostData.createdHost.hostname);
      });
      cy.getCreatedHostData().then((hostData) => {
        cy.task('createFileOnEndpoint', {
          hostname: hostData.createdHost.hostname,
          path: filePath,
          content: fileContent,
        });
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

        cy.getCreatedHostData().then((hostData) => {
          cy.task('uploadFileToEndpoint', {
            hostname: hostData.createdHost.hostname,
            srcPath: `${downloadsFolder}/upload.zip`,
            destPath: `${homeFilePath}/upload.zip`,
          });

          cy.task('readZippedFileContentOnEndpoint', {
            hostname: hostData.createdHost.hostname,
            path: `${homeFilePath}/upload.zip`,
            password: 'elastic',
          }).then((unzippedFileContent) => {
            expect(unzippedFileContent).to.equal(fileContent);
          });
        });
      });
    });

    it('"execute --command" - should execute a command', () => {
      cy.getCreatedHostData().then((hostData) => {
        waitForEndpointListPageToBeLoaded(hostData.createdHost.hostname);
      });
      openResponseConsoleFromEndpointList();
      inputConsoleCommand(`execute --command "ls -al ${homeFilePath}"`);
      submitCommand();
      waitForCommandToBeExecuted('execute');
    });

    it('"upload --file" - should upload a file', () => {
      cy.getCreatedHostData().then((hostData) => {
        waitForEndpointListPageToBeLoaded(hostData.createdHost.hostname);
      });
      openResponseConsoleFromEndpointList();
      inputConsoleCommand(`upload --file`);
      cy.getByTestSubj('console-arg-file-picker').selectFile(
        {
          contents: Cypress.Buffer.from('upload file content here!'),
          fileName: 'upload_file.txt',
          lastModified: Date.now(),
        },
        { force: true }
      );
      submitCommand();
      waitForCommandToBeExecuted('upload');
    });
  });

  // FLAKY: https://github.com/elastic/kibana/issues/168296
  describe.skip('document signing', () => {
    it('should fail if data tampered', () => {
      cy.getCreatedHostData().then((hostData) => {
        waitForEndpointListPageToBeLoaded(hostData.createdHost.hostname);
      });
      checkEndpointListForOnlyUnIsolatedHosts();
      openResponseConsoleFromEndpointList();
      performCommandInputChecks('isolate');

      cy.getCreatedHostData().then((hostData) => {
        // stop host so that we ensure tamper happens before endpoint processes the action
        cy.task('stopEndpointHost', hostData.createdHost.hostname);
        // get action doc before we submit command so we know when the new action doc is indexed
        cy.task('getLatestActionDoc').then((previousActionDoc) => {
          submitCommand();
          cy.task('tamperActionDoc', previousActionDoc);
        });
        cy.task('startEndpointHost', hostData.createdHost.hostname);
      });

      const actionValidationErrorMsg =
        'Fleet action response error: Failed to validate action signature; check Endpoint logs for details';
      cy.contains(actionValidationErrorMsg, { timeout: 120000 }).should('exist');
    });
  });
});
