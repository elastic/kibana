/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export enum BoostType {
  Value = 'value',
  Functional = 'functional',
  Proximity = 'proximity',
}

export enum BoostFunction {
  Gaussian = 'gaussian',
  Exponential = 'exponential',
  Linear = 'linear',
}

export enum BoostOperation {
  Add = 'add',
  Multiple = 'multiply',
}

export interface BaseBoost {
  operation?: BoostOperation;
  function?: BoostFunction;
}

// A boost that comes from the server, before we normalize it has a much looser schema
export interface RawBoost extends BaseBoost {
  type: BoostType;
  newBoost?: boolean;
  center?: string | number;
  value?: string | number | boolean | object | Array<string | number | boolean | object>;
  factor: number;
}

// We normalize raw boosts to make them safer and easier to work with
export interface Boost extends RawBoost {
  value?: string[];
}

export interface SearchField {
  weight: number;
}

export interface SearchSettings {
  boosts: Record<string, Boost[]>;
  search_fields: Record<string, SearchField>;
  result_fields?: object;
}
