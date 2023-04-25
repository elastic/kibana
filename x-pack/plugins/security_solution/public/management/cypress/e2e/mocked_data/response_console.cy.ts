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
  openResponseConsoleFromEndpointList,
  performCommandInputChecks,
  submitCommand,
  waitForCommandToBeExecuted,
  waitForEndpointListPageToBeLoaded,
} from '../../tasks/response_console';
import {
  checkEndpointListForIsolatedHosts,
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
    let releaseRequestResponse: ActionDetails;

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
      checkEndpointListForIsolatedHosts(false);
      openResponseConsoleFromEndpointList();
      performCommandInputChecks('isolate');
      interceptActionRequests((responseBody) => {
        isolateRequestResponse = responseBody;
      }, 'isolate');
      // cy.wait(300000);

      submitCommand();
      cy.wait('@isolate').then(() => {
        sendActionResponse(isolateRequestResponse);
      });
      waitForCommandToBeExecuted();
    });

    it('should release host from response console', () => {
      waitForEndpointListPageToBeLoaded(endpointHostname);
      checkEndpointListForIsolatedHosts(true);
      openResponseConsoleFromEndpointList();
      performCommandInputChecks('release');
      interceptActionRequests((responseBody) => {
        releaseRequestResponse = responseBody;
      }, 'release');
      submitCommand();
      cy.wait('@release').then(() => {
        sendActionResponse(releaseRequestResponse);
      });
      waitForCommandToBeExecuted();
      checkEndpointListForIsolatedHosts(false);
    });
  });
});
