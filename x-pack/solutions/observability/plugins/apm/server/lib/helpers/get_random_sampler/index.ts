/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart, KibanaRequest } from '@kbn/core/server';
import seedrandom from 'seedrandom';

export type RandomSampler = Awaited<ReturnType<typeof getRandomSampler>>;

export function getRandomSamplerSeed(coreStart: CoreStart, request: KibanaRequest): number {
  const username = coreStart.security.authc.getCurrentUser(request)?.username;
  return username ? Math.abs(seedrandom(username).int32()) : 1;
}

export function getRandomSampler({
  coreStart,
  request,
  probability,
}: {
  coreStart: CoreStart;
  request: KibanaRequest;
  probability: number;
}) {
  const seed = getRandomSamplerSeed(coreStart, request);

  return {
    probability,
    seed,
  };
}
