/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { DslQuery, Filter } from 'src/plugins/data/common';
import moment from 'moment';
import { Status } from '../../../../common/detection_engine/schemas/common/schemas';
import { RulesSchema } from '../../../../common/detection_engine/schemas/response/rules_schema';
import {
  AlertType,
  AlertTypeState,
  AlertExecutorOptions,
  AlertServices,
} from '../../../../../alerts/server';
import { BaseSearchResponse, SearchResponse, TermAggregationBucket } from '../../types';
import {
  EqlSearchResponse,
  BaseHit,
  RuleAlertAction,
  SearchTypes,
} from '../../../../common/detection_engine/types';
import { RuleTypeParams, RefreshTypes } from '../types';
import { ListClient } from '../../../../../lists/server';
import { Logger } from '../../../../../../../src/core/server';
import { ExceptionListItemSchema } from '../../../../../lists/common/schemas';
import { BuildRuleMessage } from './rule_messages';
import { TelemetryEventsSender } from '../../telemetry/sender';

// used for gap detection code
// eslint-disable-next-line @typescript-eslint/naming-convention
export type unitType = 's' | 'm' | 'h';
export const isValidUnit = (unitParam: string): unitParam is unitType =>
  ['s', 'm', 'h'].includes(unitParam);

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

export interface SignalSource {
  [key: string]: SearchTypes;
  // TODO: SignalSource is being used as the type for documents matching detection engine queries, but they may not
  // actually have @timestamp if a timestamp override is used
  '@timestamp': string;
  signal?: {
    // parent is deprecated: new signals should populate parents instead
    // both are optional until all signals with parent are gone and we can safely remove it
    parent?: Ancestor;
    parents?: Ancestor[];
    ancestors: Ancestor[];
    group?: {
      id: string;
      index?: number;
    };
    rule: {
      id: string;
    };
    // signal.depth doesn't exist on pre-7.10 signals
    depth?: number;
  };
}

export interface BulkItem {
  create?: {
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
export type BaseSignalHit = BaseHit<SignalSource>;

export type EqlSignalSearchResponse = EqlSearchResponse<SignalSource>;

export type RuleExecutorOptions = Omit<AlertExecutorOptions, 'params'> & {
  params: RuleTypeParams;
};

// This returns true because by default a RuleAlertTypeDefinition is an AlertType
// since we are only increasing the strictness of params.
export const isAlertExecutor = (obj: SignalRuleAlertTypeDefinition): obj is AlertType => {
  return true;
};

export type SignalRuleAlertTypeDefinition = Omit<AlertType, 'executor'> & {
  executor: ({ services, params, state }: RuleExecutorOptions) => Promise<AlertTypeState | void>;
};

export interface Ancestor {
  rule?: string;
  id: string;
  type: string;
  index: string;
  depth: number;
}

export interface Signal {
  rule: RulesSchema;
  // DEPRECATED: use parents instead of parent
  parent?: Ancestor;
  parents: Ancestor[];
  ancestors: Ancestor[];
  group?: {
    id: string;
    index?: number;
  };
  original_time?: string;
  original_event?: SearchTypes;
  status: Status;
  threshold_count?: SearchTypes;
  original_signal?: SearchTypes;
  depth: number;
}

export interface SignalHit {
  '@timestamp': string;
  event: object;
  signal: Signal;
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

/**
 * TODO: Remove this if/when the return filter has its own type exposed
 */
export interface QueryFilter {
  bool: {
    must: DslQuery[];
    filter: Filter[];
    should: unknown[];
    must_not: Filter[];
  };
}

export interface SearchAfterAndBulkCreateParams {
  gap: moment.Duration | null;
  previousStartedAt: Date | null | undefined;
  ruleParams: RuleTypeParams;
  services: AlertServices;
  listClient: ListClient;
  exceptionsList: ExceptionListItemSchema[];
  logger: Logger;
  eventsTelemetry: TelemetryEventsSender | undefined;
  id: string;
  inputIndexPattern: string[];
  signalsIndex: string;
  name: string;
  actions: RuleAlertAction[];
  createdAt: string;
  createdBy: string;
  updatedBy: string;
  updatedAt: string;
  interval: string;
  enabled: boolean;
  pageSize: number;
  filter: unknown;
  refresh: RefreshTypes;
  tags: string[];
  throttle: string;
  buildRuleMessage: BuildRuleMessage;
}

export interface SearchAfterAndBulkCreateReturnType {
  success: boolean;
  searchAfterTimes: string[];
  bulkCreateTimes: string[];
  lastLookBackDate: Date | null | undefined;
  createdSignalsCount: number;
  errors: string[];
}

export interface ThresholdAggregationBucket extends TermAggregationBucket {
  top_threshold_hits: BaseSearchResponse<SignalSource>;
}

export interface ThresholdQueryBucket extends TermAggregationBucket {
  lastSignalTimestamp: {
    value_as_string: string;
  };
}
