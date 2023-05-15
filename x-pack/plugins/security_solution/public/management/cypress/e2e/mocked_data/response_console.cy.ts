/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ActionDetails } from '../../../../../common/endpoint/types';
import type { ReturnTypeFromChainable } from '../../types';
import { indexEndpointHosts } from '../../tasks/index_endpoint_hosts';
import {
  checkReturnedProcessesTable,
  inputConsoleCommand,
  openResponseConsoleFromEndpointList,
  performCommandInputChecks,
  submitCommand,
  waitForEndpointListPageToBeLoaded,
} from '../../tasks/response_console';
import {
  checkEndpointIsIsolated,
  checkEndpointIsNotIsolated,
  interceptActionRequests,
  sendActionResponse,
} from '../../tasks/isolate';
import { login } from '../../tasks/login';

describe('Response console', () => {
  beforeEach(() => {
    login();
  });

  describe('Isolate command', () => {
    let endpointData: ReturnTypeFromChainable<typeof indexEndpointHosts>;
    let endpointHostname: string;
    let isolateRequestResponse: ActionDetails;

    before(() => {
      indexEndpointHosts({ withResponseActions: false, isolation: false }).then(
        (indexEndpoints) => {
          endpointData = indexEndpoints;
          endpointHostname = endpointData.data.hosts[0].host.name;
        }
      );
    });

    after(() => {
      if (endpointData) {
        endpointData.cleanup();
        // @ts-expect-error ignore setting to undefined
        endpointData = undefined;
      }
    });

    it('should isolate host from response console', () => {
      waitForEndpointListPageToBeLoaded(endpointHostname);
      checkEndpointIsNotIsolated(endpointHostname);
      openResponseConsoleFromEndpointList();
      performCommandInputChecks('isolate');
      interceptActionRequests((responseBody) => {
        isolateRequestResponse = responseBody;
      }, 'isolate');

      submitCommand();
      cy.contains('Action pending.').should('exist');
      cy.wait('@isolate').then(() => {
        sendActionResponse(isolateRequestResponse);
      });
      cy.contains('Action completed.', { timeout: 120000 }).should('exist');
      waitForEndpointListPageToBeLoaded(endpointHostname);
      checkEndpointIsIsolated(endpointHostname);
    });
  });

  describe('Release command', () => {
    let endpointData: ReturnTypeFromChainable<typeof indexEndpointHosts>;
    let endpointHostname: string;
    let releaseRequestResponse: ActionDetails;

    before(() => {
      indexEndpointHosts({ withResponseActions: false, isolation: true }).then((indexEndpoints) => {
        endpointData = indexEndpoints;
        endpointHostname = endpointData.data.hosts[0].host.name;
      });
    });

    after(() => {
      if (endpointData) {
        endpointData.cleanup();
        // @ts-expect-error ignore setting to undefined
        endpointData = undefined;
      }
    });

    it('should release host from response console', () => {
      waitForEndpointListPageToBeLoaded(endpointHostname);
      checkEndpointIsIsolated(endpointHostname);
      openResponseConsoleFromEndpointList();
      performCommandInputChecks('release');
      interceptActionRequests((responseBody) => {
        releaseRequestResponse = responseBody;
      }, 'release');
      submitCommand();
      cy.contains('Action pending.').should('exist');
      cy.wait('@release').then(() => {
        sendActionResponse(releaseRequestResponse);
      });
      cy.contains('Action completed.', { timeout: 120000 }).should('exist');
      waitForEndpointListPageToBeLoaded(endpointHostname);
      checkEndpointIsNotIsolated(endpointHostname);
    });
  });

  describe('Processes command', () => {
    let endpointData: ReturnTypeFromChainable<typeof indexEndpointHosts>;
    let endpointHostname: string;
    let processesRequestResponse: ActionDetails;

    before(() => {
      indexEndpointHosts({ withResponseActions: false, isolation: false }).then(
        (indexEndpoints) => {
          endpointData = indexEndpoints;
          endpointHostname = endpointData.data.hosts[0].host.name;
        }
      );
    });

    after(() => {
      if (endpointData) {
        endpointData.cleanup();
        // @ts-expect-error ignore setting to undefined
        endpointData = undefined;
      }
    });

    it('should return processes from response console', () => {
      waitForEndpointListPageToBeLoaded(endpointHostname);
      openResponseConsoleFromEndpointList();
      performCommandInputChecks('processes');
      interceptActionRequests((responseBody) => {
        processesRequestResponse = responseBody;
      }, 'processes');
      submitCommand();
      cy.contains('Action pending.').should('exist');
      cy.wait('@processes').then(() => {
        sendActionResponse(processesRequestResponse);
      });
      cy.getByTestSubj('getProcessesSuccessCallout', { timeout: 120000 }).within(() => {
        checkReturnedProcessesTable();
      });
    });
  });

  describe('Kill process command', () => {
    let endpointData: ReturnTypeFromChainable<typeof indexEndpointHosts>;
    let endpointHostname: string;
    let killProcessRequestResponse: ActionDetails;

    before(() => {
      indexEndpointHosts({ withResponseActions: false, isolation: false }).then(
        (indexEndpoints) => {
          endpointData = indexEndpoints;
          endpointHostname = endpointData.data.hosts[0].host.name;
        }
      );
    });

    after(() => {
      if (endpointData) {
        endpointData.cleanup();
        // @ts-expect-error ignore setting to undefined
        endpointData = undefined;
      }
    });

    it('should kill process from response console', () => {
      waitForEndpointListPageToBeLoaded(endpointHostname);
      openResponseConsoleFromEndpointList();
      inputConsoleCommand(`kill-process --pid 1`);

      interceptActionRequests((responseBody) => {
        killProcessRequestResponse = responseBody;
      }, 'kill-process');
      submitCommand();
      cy.contains('Action pending.').should('exist');
      cy.wait('@kill-process').then(() => {
        sendActionResponse(killProcessRequestResponse);
      });
      cy.contains('Action completed.', { timeout: 120000 }).should('exist');
    });
  });

  describe('Suspend process command', () => {
    let endpointData: ReturnTypeFromChainable<typeof indexEndpointHosts>;
    let endpointHostname: string;
    let suspendProcessRequestResponse: ActionDetails;

    before(() => {
      indexEndpointHosts({ withResponseActions: false, isolation: false }).then(
        (indexEndpoints) => {
          endpointData = indexEndpoints;
          endpointHostname = endpointData.data.hosts[0].host.name;
        }
      );
    });

    after(() => {
      if (endpointData) {
        endpointData.cleanup();
        // @ts-expect-error ignore setting to undefined
        endpointData = undefined;
      }
    });

    it('should suspend process from response console', () => {
      waitForEndpointListPageToBeLoaded(endpointHostname);
      openResponseConsoleFromEndpointList();
      inputConsoleCommand(`suspend-process --pid 1`);

      interceptActionRequests((responseBody) => {
        suspendProcessRequestResponse = responseBody;
      }, 'suspend-process');
      submitCommand();
      cy.contains('Action pending.').should('exist');
      cy.wait('@suspend-process').then(() => {
        sendActionResponse(suspendProcessRequestResponse);
      });
      cy.contains('Action completed.', { timeout: 120000 }).should('exist');
    });
  });
});
