/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
export function parseOtelDuration(duration?: number[] | string) {
  const parsedDuration = Array.isArray(duration)
    ? duration[0]
    : duration
    ? parseFloat(duration)
    : 0;

  return parsedDuration === undefined || Number.isNaN(parsedDuration) ? 0 : parsedDuration * 0.001;
}
