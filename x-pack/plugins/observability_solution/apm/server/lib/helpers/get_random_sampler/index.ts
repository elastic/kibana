/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SecurityRequestHandlerContext } from '@kbn/core-security-server';
import seedrandom from 'seedrandom';

export type RandomSampler = Awaited<ReturnType<typeof getRandomSampler>>;

export async function getRandomSampler({
  security,
  probability,
}: {
  security: SecurityRequestHandlerContext;
  probability: number;
}) {
  let seed = 1;

  const username = security.authc.getCurrentUser()?.username;

  if (username) {
    seed = Math.abs(seedrandom(username).int32());
  }

  return {
    probability,
    seed,
  };
}
