/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type BoostType = 'value' | 'functional' | 'proximity';

export interface Boost {
  type: BoostType;
  operation?: string;
  function?: string;
  newBoost?: boolean;
  center?: string | number;
  value?: string | number | string[] | number[];
  factor: number;
}

export interface BoostObject {
  [key: string]: Boost[];
}

export interface SearchSettings {
  boosts: Record<string, Boost[]>;
  search_fields: object;
}
