/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getRuntimeServices, startRuntimeServices, stopRuntimeServices } from './runtime';
import { checkDependencies } from './pre_check';
import { enrollEndpointHost } from './elastic_endpoint';
import type { StartRuntimeServicesOptions } from './types';
import { startFleetServerIfNecessary } from '../common/fleet_server/fleet_server_services';

export const setupAll = async (options: StartRuntimeServicesOptions) => {
  await startRuntimeServices(options);

  const { kbnClient, log } = getRuntimeServices();

  await checkDependencies();

  await startFleetServerIfNecessary({
    kbnClient,
    logger: log,
  });

  await enrollEndpointHost();

  await stopRuntimeServices();
};
