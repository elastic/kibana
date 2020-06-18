/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Status } from '../../../../common/detection_engine/schemas/common/schemas';
import { RulesSchema } from '../../../../common/detection_engine/schemas/response/rules_schema';
import { AlertType, State, AlertExecutorOptions } from '../../../../../alerts/server';
import { RuleAlertAction } from '../../../../common/detection_engine/types';
import { RuleTypeParams } from '../types';
import { SearchResponse } from '../../types';

export interface SignalsParams {
  signalIds: string[] | undefined | null;
  query: object | undefined | null;
  status: Status;
}

export interface SignalsStatusParams {
  signalIds: string[] | undefined | null;
  query: object | undefined | null;
  status: Status;
}

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

export interface SignalSource {
  [key: string]: SearchTypes;
  '@timestamp': string;
  signal?: {
    parent: Ancestor;
    ancestors: Ancestor[];
  };
}

export interface BulkItem {
  create: {
    _index: string;
    _type?: string;
    _id: string;
    _version: number;
    result?: string;
    _shards?: {
      total: number;
      successful: number;
      failed: number;
    };
    _seq_no?: number;
    _primary_term?: number;
    status: number;
    error?: {
      type: string;
      reason: string;
      index_uuid?: string;
      shard: string;
      index: string;
    };
  };
}

export interface BulkResponse {
  took: number;
  errors: boolean;
  items: BulkItem[];
}

export interface MGetResponse {
  docs: GetResponse[];
}
export interface GetResponse {
  _index: string;
  _type: string;
  _id: string;
  _version: number;
  _seq_no: number;
  _primary_term: number;
  found: boolean;
  _source: SearchTypes;
}

export type EventSearchResponse = SearchResponse<EventSource>;
export type SignalSearchResponse = SearchResponse<SignalSource>;
export type SignalSourceHit = SignalSearchResponse['hits']['hits'][number];

export type RuleExecutorOptions = Omit<AlertExecutorOptions, 'params'> & {
  params: RuleTypeParams;
};

// This returns true because by default a RuleAlertTypeDefinition is an AlertType
// since we are only increasing the strictness of params.
export const isAlertExecutor = (obj: SignalRuleAlertTypeDefinition): obj is AlertType => {
  return true;
};

export type SignalRuleAlertTypeDefinition = Omit<AlertType, 'executor'> & {
  executor: ({ services, params, state }: RuleExecutorOptions) => Promise<State | void>;
};

export interface Ancestor {
  rule: string;
  id: string;
  type: string;
  index: string;
  depth: number;
}

export interface Signal {
  rule: Partial<RulesSchema>;
  parent: Ancestor;
  ancestors: Ancestor[];
  original_time: string;
  original_event?: SearchTypes;
  status: Status;
}

export interface SignalHit {
  '@timestamp': string;
  event: object;
  signal: Partial<Signal>;
}

export interface AlertAttributes {
  actions: RuleAlertAction[];
  enabled: boolean;
  name: string;
  tags: string[];
  createdBy: string;
  createdAt: string;
  updatedBy: string;
  schedule: {
    interval: string;
  };
  throttle: string;
}

export interface RuleAlertAttributes extends AlertAttributes {
  params: RuleTypeParams;
}

export type BulkResponseErrorAggregation = Record<string, { count: number; statusCode: number }>;
