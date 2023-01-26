/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolingLog } from '@kbn/tooling-log';
import { startRuntimeServices, stopRuntimeServices } from './runtime';
import { checkDependencies } from './pre_check';
import { runFleetServerIfNeeded } from './fleet_server';
import { enrollEndpointHost } from './elastic_endpoint';

interface SetupOptions {
  kibanaUrl: string;
  elasticUrl: string;
  username: string;
  password: string;
  log?: ToolingLog;
}
export const setupAll = async (options: SetupOptions) => {
  await startRuntimeServices(options);

  await checkDependencies();

  await runFleetServerIfNeeded();

  await enrollEndpointHost();

  await stopRuntimeServices();
};
