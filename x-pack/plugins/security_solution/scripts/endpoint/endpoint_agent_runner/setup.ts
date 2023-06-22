/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { runFleetServerIfNeeded } from './fleet_server';
import { startRuntimeServices, stopRuntimeServices } from './runtime';
import { checkDependencies } from './pre_check';
import { enrollEndpointHost } from './elastic_endpoint';
import type { StartRuntimeServicesOptions } from './types';

export const setupAll = async (options: StartRuntimeServicesOptions) => {
  await startRuntimeServices(options);

  await checkDependencies();

  await runFleetServerIfNeeded();

  await enrollEndpointHost();

  await stopRuntimeServices();
};
