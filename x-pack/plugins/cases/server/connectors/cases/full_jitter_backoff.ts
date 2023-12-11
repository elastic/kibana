/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Implements the [Full Jitter Backoff algorithm](
 * https://aws.amazon.com/blogs/architecture/exponential-backoff-and-jitter/)
 *
 */

const getRandomIntegerFromInterval = (min: number, max: number) => {
  return Math.floor(Math.random() * (max - min + 1) + min);
};

const throwIfNegative = (value: number, fieldName: string) => {
  if (value < 0) {
    throw new Error(`${fieldName} must not be negative`);
  }
};

export const fullJitterBackOffFactory = (baseDelay: number, maxBackoffTime: number) => {
  throwIfNegative(baseDelay, 'baseDelay');
  throwIfNegative(maxBackoffTime, 'maxBackoffTime');

  return {
    create: () => {
      let currentTry = 0;
      return {
        nextBackOff: () => {
          const sleep = Math.min(maxBackoffTime, baseDelay * Math.pow(2, currentTry));

          currentTry += 1;

          return getRandomIntegerFromInterval(0, sleep);
        },
      };
    },
  };
};
