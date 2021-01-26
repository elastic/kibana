/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export type BoostType = 'value' | 'functional' | 'proximity';

export interface IBoost {
  type: BoostType;
  operation?: string;
  function?: string;
  newBoost?: boolean;
  center?: string | number;
  value?: string | number | string[] | number[];
  factor: number;
}

export interface BoostObject {
  [key: string]: IBoost[];
}

export interface SearchSettings {
  boosts: BoostObject;
  search_fields: object;
}
