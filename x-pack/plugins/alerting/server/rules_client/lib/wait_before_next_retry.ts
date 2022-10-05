/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// number of times to retry when conflicts occur
export const RETRY_IF_CONFLICTS_ATTEMPTES = 2;

// milliseconds to wait before retrying when conflicts occur
// note: we considered making this random, to help avoid a stampede, but
// with 1 retry it probably doesn't matter, and adding randomness could
// make it harder to diagnose issues
const RETRY_IF_CONFLICTS_DELAY = 250;

/**
 * exponential delay before retry with adding random delay
 */
export const waitBeforeNextRetry = async (retries: number): Promise<void> => {
  const exponentialDelayMultiplier = 1 + (RETRY_IF_CONFLICTS_ATTEMPTES - retries) ** 2;
  const randomDelayMs = Math.floor(Math.random() * 100);

  await new Promise((resolve) =>
    setTimeout(resolve, RETRY_IF_CONFLICTS_DELAY * exponentialDelayMultiplier + randomDelayMs)
  );
};
