/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Scale the score into a value from 0 - 1
// using a concave piecewise linear function in -log(p-value)
export const getNormalizedScore = (score: number): number =>
  0.5 * Math.min(Math.max((score - 3.912) / 2.995, 0), 1) +
  0.25 * Math.min(Math.max((score - 6.908) / 6.908, 0), 1) +
  0.25 * Math.min(Math.max((score - 13.816) / 101.314, 0), 1);
