/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Two services that call each other, in either direction, and how much. */
export interface WeightedEdge {
  source: string;
  target: string;
  weight: number;
}
