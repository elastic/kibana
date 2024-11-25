/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { logger } from './logger';
import type { HostVm } from '../../../../scripts/endpoint/common/types';
import type { CreateAndEnrollEndpointHostResponse } from '../../../../scripts/endpoint/common/endpoint_host_services';

// only used in "real" endpoint tests not in mocked ones
export const createEndpointHost = (
  agentPolicyId: string,
  version?: string,
  timeout?: number
): Cypress.Chainable<CreateAndEnrollEndpointHostResponse> => {
  return cy
    .task(
      'createEndpointHost',
      {
        agentPolicyId,
        ...(version ? { version, forceVersion: true } : {}),
      },
      { timeout: timeout ?? 30 * 60 * 1000 }
    )
    .then((createdHost) => {
      const notImplementedMethod = () => {
        throw new Error('Not implemented for use from cypress tests!');
      };

      return {
        ...createdHost,
        hostVm: {
          ...createdHost.hostVm,

          // Implement the methods of the `HostVm` type here for execution from cypress

          exec: (command: string) => {
            return cy.task('execCommandOnHost', { hostname: createdHost.hostname, command });
          },

          mount: notImplementedMethod,
          unmount: notImplementedMethod,
          transfer: notImplementedMethod,
          destroy: notImplementedMethod,
          info: notImplementedMethod,
          stop: notImplementedMethod,
          start: notImplementedMethod,
        },
      };
    });
};

export const captureHostEndpointLog = (hostVm: HostVm): Cypress.Chainable => {
  logger.info(`Capturing Endpoint host VM log for VM [${hostVm.name}]`);

  const logFile = '/opt/Elastic/Endpoint/state/log/endpoint-000000.log';
  const nLines = 500;

  return hostVm.exec(`sudo tail -n ${nLines} ${logFile}`).then((response) => {
    logger.verbose(
      `Last ${nLines} lines from Endpoint log on host [${hostVm.name}]:\n----------------\n${response.stdout}\n----------------\n`
    );
    return response.stdout;
  });
};
