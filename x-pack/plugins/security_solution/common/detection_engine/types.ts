/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AlertAction } from '../../../alerts/common';

export type RuleAlertAction = Omit<AlertAction, 'actionTypeId'> & {
  action_type_id: string;
};

export type SearchTypes =
  | string
  | string[]
  | number
  | number[]
  | boolean
  | boolean[]
  | object
  | object[]
  | undefined;

export interface Explanation {
  value: number;
  description: string;
  details: Explanation[];
}

export interface TotalValue {
  value: number;
  relation: string;
}

export interface BaseHit<T> {
  _index: string;
  _id: string;
  _source: T;
  fields?: Record<string, SearchTypes[]>;
}

export interface EqlSequence<T> {
  join_keys: SearchTypes[];
  events: Array<BaseHit<T>>;
}

export interface EqlSearchResponse<T> {
  is_partial: boolean;
  is_running: boolean;
  took: number;
  timed_out: boolean;
  hits: {
    total: TotalValue;
    sequences?: Array<EqlSequence<T>>;
    events?: Array<BaseHit<T>>;
  };
}

export interface BooleanFilter {
  bool: {
    must?: unknown | unknown[];
    must_not?: unknown | unknown[];
    should?: unknown[];
    filter?: unknown | unknown[];
    minimum_should_match?: number;
  };
}

export interface NestedFilter {
  nested: {
    path: string;
    query: unknown | unknown[];
    score_mode: string;
  };
}
