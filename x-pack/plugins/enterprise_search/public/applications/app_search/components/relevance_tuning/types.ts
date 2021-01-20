/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export type IBoostType = 'value' | 'functional' | 'proximity';

export interface IBoost {
  type: IBoostType;
  operation?: string;
  function?: string;
  newBoost?: boolean;
  center?: string | number;
  value?: string | number | string[] | number[];
  factor: number;
}

export interface IBoostObject {
  [key: string]: IBoost[];
}

export interface ISearchSettings {
  boosts: IBoostObject;
  search_fields: object;
}
