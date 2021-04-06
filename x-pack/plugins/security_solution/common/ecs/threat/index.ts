/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

interface ThreatMatchEcs {
  atomic?: string[];
  field?: string[];
  type?: string[];
}

export interface ThreatIndicatorEcs {
  matched?: ThreatMatchEcs;
  type?: string[];
}

export interface ThreatEcs {
  indicator: ThreatIndicatorEcs[];
}
