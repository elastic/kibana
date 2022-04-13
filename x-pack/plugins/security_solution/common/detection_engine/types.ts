/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RuleAction } from '../../../alerting/common';

export type RuleAlertAction = Omit<RuleAction, 'actionTypeId'> & {
  action_type_id: string;
};

/**
 * Defines the search types you can have from Elasticsearch within a
 * doc._source. It uses recursive types of "| SearchTypes[]" to designate
 * anything can also be of a type array, and it uses the recursive type of
 * "| { [property: string]: SearchTypes }" to designate you can can sub-objects
 * or sub-sub-objects, etc...
 */
export type SearchTypes = string | number | boolean | object | SearchTypes[] | undefined;

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

export interface HTTPError extends Error {
  body?: unknown;
}
