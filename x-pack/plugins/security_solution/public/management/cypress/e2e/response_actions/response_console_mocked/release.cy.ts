/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ActionDetails } from '../../../../../../common/endpoint/types';
import type { ReturnTypeFromChainable } from '../../../types';
import { indexEndpointHosts } from '../../../tasks/index_endpoint_hosts';
import {
  openResponseConsoleFromEndpointList,
  performCommandInputChecks,
  submitCommand,
  waitForEndpointListPageToBeLoaded,
} from '../../../tasks/response_console';
import {
  checkEndpointIsIsolated,
  checkEndpointIsNotIsolated,
  interceptActionRequests,
  sendActionResponse,
} from '../../../tasks/isolate';
import { login } from '../../../tasks/login';

describe('Response console', { tags: ['@ess', '@serverless', '@brokenInServerless'] }, () => {
  beforeEach(() => {
    login();
  });

  describe('`release` command', () => {
    let endpointData: ReturnTypeFromChainable<typeof indexEndpointHosts>;
    let endpointHostname: string;
    let releaseRequestResponse: ActionDetails;

    beforeEach(() => {
      indexEndpointHosts({ withResponseActions: false, isolation: true }).then((indexEndpoints) => {
        endpointData = indexEndpoints;
        endpointHostname = endpointData.data.hosts[0].host.name;
      });
    });

    afterEach(() => {
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
});
