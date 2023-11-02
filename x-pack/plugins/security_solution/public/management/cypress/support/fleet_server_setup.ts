/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { startFleetServerIfNecessary } from '../../../../scripts/endpoint/common/fleet_server/fleet_server_services';
import { setupStackServicesUsingCypressConfig } from './common';

// FIXME:PT delete this

export const setupFleetServerForCypressTestRun = async (
  on: Cypress.PluginEvents,
  config: Cypress.PluginConfigOptions
) => {
  const { kbnClient, log } = await setupStackServicesUsingCypressConfig(config);

  const startedFleetServer = await startFleetServerIfNecessary({
    kbnClient,
    logger: log,
  }).catch(log.error);

  on('after:run', async () => {
    if (startedFleetServer) {
      await startedFleetServer.stop();
    }
  });
};
