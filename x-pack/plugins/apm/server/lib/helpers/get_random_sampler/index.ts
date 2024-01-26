/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KibanaRequest } from '@kbn/core/server';
import seedrandom from 'seedrandom';
import { APMRouteHandlerResources } from '../../../routes/apm_routes/register_apm_server_routes';

export async function getRandomSampler({
  security,
  request,
  probability,
}: {
  security: APMRouteHandlerResources['plugins']['security'];
  request: KibanaRequest;
  probability: number;
}) {
  let seed = 1;

  if (security) {
    const securityPluginStart = await security.start();
    const username =
      securityPluginStart.authc.getCurrentUser(request)?.username;

    if (username) {
      seed = Math.abs(seedrandom(username).int32());
    }
  }

  return {
    probability,
    seed,
  };
}

export type RandomSampler = Awaited<ReturnType<typeof getRandomSampler>>;
