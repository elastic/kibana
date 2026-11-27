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

/** How a service takes part in the calls between the map's services. */
export interface ServiceCallStats {
  /** Distinct services that call it. */
  callers: number;
  /** Distinct services it calls or that call it. */
  neighbours: number;
  /** Calls it made and received over the last day. */
  traffic: number;
}
