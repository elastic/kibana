/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const roundDown = (time: number, roundInMs: number) => {
  return time - (time % roundInMs);
};

const FIFTEEN_MINUTES_IN_MS = 15 * 60 * 1000;

export function getAnomalySearchTimeRange({
  from,
  to,
  bucketSpanInMs = FIFTEEN_MINUTES_IN_MS,
  minNumBuckets = 2,
}: {
  from: number | undefined;
  to: number;
  bucketSpanInMs?: number;
  minNumBuckets?: number;
}) {
  const atLeast = to - bucketSpanInMs * minNumBuckets;
  const fromRounded = roundDown(Math.min(atLeast, from ?? to), bucketSpanInMs);

  return {
    from: fromRounded,
    to,
  };
}
