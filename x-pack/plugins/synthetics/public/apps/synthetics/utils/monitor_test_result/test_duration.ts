/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Formats the microseconds (µ) into either milliseconds (ms) or seconds (s) based on the duration value
 * @param us {number} duration value in microseconds
 */
export const formatTestDuration = (us?: number) => {
  const microSecs = us ?? 0;
  const secs = microSecs / (1000 * 1000);
  if (secs >= 1) {
    return `${secs.toFixed(1)} s`;
  }

  return `${(microSecs / 1000).toFixed(0)} ms`;
};
