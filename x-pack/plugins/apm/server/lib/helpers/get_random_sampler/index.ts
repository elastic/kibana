/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KibanaRequest } from '@kbn/core/server';
import seedrandom from 'seedrandom';
import { APMRouteHandlerResources } from '../../..';

export async function getRandomSampler({
  security,
  request,
  probability,
}: {
  security: APMRouteHandlerResources['plugins']['security'];
  request: KibanaRequest;
  probability: number;
}) {
  const defaultSeed = 1;

  if (security) {
    const securityPluginStart = await security.start();
    const username =
      securityPluginStart.authc.getCurrentUser(request)?.username;

    return {
      probability,
      seed: username ? Math.abs(seedrandom(username).int32()) : defaultSeed,
    };
  }

  return {
    probability,
    seed: defaultSeed,
  };
}

export type RandomSampler = Awaited<ReturnType<typeof getRandomSampler>>;
