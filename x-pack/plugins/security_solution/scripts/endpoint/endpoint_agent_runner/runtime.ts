/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolingLog } from '@kbn/tooling-log';
import type { RuntimeServices } from '../common/stack_services';
import { createRuntimeServices } from '../common/stack_services';

let runtimeServices: undefined | RuntimeServices;

interface StartRuntimeServicesOptions {
  kibanaUrl: string;
  elasticUrl: string;
  username: string;
  password: string;
  log?: ToolingLog;
}

export const startRuntimeServices = async ({
  log = new ToolingLog(),
  elasticUrl,
  kibanaUrl,
  username,
  password,
}: StartRuntimeServicesOptions) => {
  runtimeServices = await createRuntimeServices({
    kibanaUrl,
    elasticsearchUrl: elasticUrl,
    username,
    password,
    log,
  });
};

export const stopRuntimeServices = async () => {
  runtimeServices = undefined;
};

export const getRuntimeServices = () => {
  if (!runtimeServices) {
    throw new Error(`Runtime services have not be initialized yet!`);
  }

  return runtimeServices;
};
