/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { BoolQuery } from '@kbn/es-query';
import moment from 'moment';
import type { ExceptionListItemSchema } from '@kbn/securitysolution-io-ts-list-types';
import { Status } from '../../../../common/detection_engine/schemas/common/schemas';
import { RulesSchema } from '../../../../common/detection_engine/schemas/response/rules_schema';
import {
  AlertType,
  AlertTypeState,
  AlertInstanceState,
  AlertInstanceContext,
  AlertExecutorOptions,
  AlertServices,
} from '../../../../../alerting/server';
import { TermAggregationBucket } from '../../types';
import {
  EqlSearchResponse,
  BaseHit,
  RuleAlertAction,
  SearchTypes,
  EqlSequence,
} from '../../../../common/detection_engine/types';
import { ListClient } from '../../../../../lists/server';
import { Logger } from '../../../../../../../src/core/server';
import { BuildRuleMessage } from './rule_messages';
import { TelemetryEventsSender } from '../../telemetry/sender';
import { CompleteRule, RuleParams } from '../schemas/rule_schemas';
import { GenericBulkCreateResponse } from './bulk_create_factory';
import { EcsFieldMap } from '../../../../../rule_registry/common/assets/field_maps/ecs_field_map';
import { TypeOfFieldMap } from '../../../../../rule_registry/common/field_map';
import { BuildReasonMessage } from './reason_formatters';
import { RACAlert } from '../rule_types/types';

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

export interface ThresholdResult {
  terms?: Array<{
    field: string;
    value: string;
  }>;
  cardinality?: Array<{
    field: string;
    value: number;
  }>;
  count: number;
  from: string;
}

export interface ThresholdSignalHistoryRecord {
  terms: Array<{
    field?: string;
    value: SearchTypes;
  }>;
  lastSignalTimestamp: number;
}

export interface ThresholdSignalHistory {
  [hash: string]: ThresholdSignalHistoryRecord;
}

export interface RuleRangeTuple {
  to: moment.Moment;
  from: moment.Moment;
  maxSignals: number;
}

/**
 * SignalSource is being used as both a type for documents that match detection engine queries as well as
 * for queries that could be on top of signals. In cases where it is matched against detection engine queries,
 * '@timestamp' might not be there since it is not required and we have timestamp override capabilities. Also
 * the signal addition object, "signal?: {" will not be there unless it's a conflicting field when we are running
 * queries on events.
 *
 * For cases where we are running queries against signals (signals on signals) "@timestamp" should always be there
 * and the "signal?: {" sub-object should always be there.
 */
export interface SignalSource {
  [key: string]: SearchTypes;
  '@timestamp'?: string;
  signal?: {
    /**
     * "parent" is deprecated: new signals should populate "parents" instead. Both are optional
     * until all signals with parent are gone and we can safely remove it.
     * @deprecated Use parents instead
     */
    parent?: Ancestor;
    parents?: Ancestor[];
    ancestors: Ancestor[];
    group?: {
      id: string;
      index?: number;
    };
    rule: {
      id: string;
      false_positives?: string[];
      immutable?: boolean;
    };
    /** signal.depth was introduced in 7.10 and pre-7.10 signals do not have it. */
    depth?: number;
    original_time?: string;
    threshold_result?: ThresholdResult;
  };
  kibana?: SearchTypes;
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

export type EventHit = Exclude<TypeOfFieldMap<EcsFieldMap>, '@timestamp'> & {
  '@timestamp': string;
  [key: string]: SearchTypes;
};
export type WrappedEventHit = BaseHit<EventHit>;

export type AlertSearchResponse = estypes.SearchResponse<RACAlert>;
export type SignalSearchResponse = estypes.SearchResponse<SignalSource>;
export type SignalSourceHit = estypes.SearchHit<SignalSource>;
export type WrappedSignalHit = BaseHit<SignalHit>;
export type BaseSignalHit = estypes.SearchHit<SignalSource>;

export type EqlSignalSearchResponse = EqlSearchResponse<SignalSource>;

export type RuleExecutorOptions = AlertExecutorOptions<
  RuleParams,
  AlertTypeState,
  AlertInstanceState,
  AlertInstanceContext
>;

// This returns true because by default a RuleAlertTypeDefinition is an AlertType
// since we are only increasing the strictness of params.
export const isAlertExecutor = (
  obj: SignalRuleAlertTypeDefinition
): obj is AlertType<
  RuleParams,
  RuleParams, // This type is used for useSavedObjectReferences, use an Omit here if you want to remove any values.
  AlertTypeState,
  AlertInstanceState,
  AlertInstanceContext,
  'default'
> => {
  return true;
};

export type SignalRuleAlertTypeDefinition = AlertType<
  RuleParams,
  RuleParams, // This type is used for useSavedObjectReferences, use an Omit here if you want to remove any values.
  AlertTypeState,
  AlertInstanceState,
  AlertInstanceContext,
  'default'
>;

export interface Ancestor {
  rule?: string;
  id: string;
  type: string;
  index: string;
  depth: number;
}

export interface Signal {
  _meta?: {
    version: number;
  };
  rule: RulesSchema;
  /**
   * @deprecated Use "parents" instead of "parent"
   */
  parent?: Ancestor;
  parents: Ancestor[];
  ancestors: Ancestor[];
  group?: {
    id: string;
    index?: number;
  };
  original_time?: string;
  original_event?: SearchTypes;
  reason?: string;
  status: Status;
  threshold_result?: ThresholdResult;
  original_signal?: SearchTypes;
  depth: number;
}

export interface SignalHit {
  '@timestamp': string;
  event: object;
  signal: Signal;
  [key: string]: SearchTypes;
}

export interface AlertAttributes<T extends RuleParams = RuleParams> {
  actions: RuleAlertAction[];
  alertTypeId: string;
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
  params: T;
}

export type BulkResponseErrorAggregation = Record<string, { count: number; statusCode: number }>;

/**
 * TODO: Remove this if/when the return filter has its own type exposed
 */
export interface QueryFilter {
  bool: BoolQuery;
}

export type SignalsEnrichment = (signals: SignalSearchResponse) => Promise<SignalSearchResponse>;

export type BulkCreate = <T extends Record<string, unknown>>(
  docs: Array<BaseHit<T>>
) => Promise<GenericBulkCreateResponse<T>>;

export type SimpleHit = BaseHit<{ '@timestamp'?: string }>;

export type WrapHits = (
  hits: Array<estypes.SearchHit<SignalSource>>,
  buildReasonMessage: BuildReasonMessage
) => SimpleHit[];

export type WrapSequences = (
  sequences: Array<EqlSequence<SignalSource>>,
  buildReasonMessage: BuildReasonMessage
) => SimpleHit[];

export interface SearchAfterAndBulkCreateParams {
  tuple: {
    to: moment.Moment;
    from: moment.Moment;
    maxSignals: number;
  };
  completeRule: CompleteRule<RuleParams>;
  services: AlertServices<AlertInstanceState, AlertInstanceContext, 'default'>;
  listClient: ListClient;
  exceptionsList: ExceptionListItemSchema[];
  logger: Logger;
  eventsTelemetry: TelemetryEventsSender | undefined;
  id: string;
  inputIndexPattern: string[];
  signalsIndex: string;
  pageSize: number;
  filter: unknown;
  buildRuleMessage: BuildRuleMessage;
  buildReasonMessage: BuildReasonMessage;
  enrichment?: SignalsEnrichment;
  bulkCreate: BulkCreate;
  wrapHits: WrapHits;
  trackTotalHits?: boolean;
  sortOrder?: estypes.SearchSortOrder;
}

export interface SearchAfterAndBulkCreateReturnType {
  success: boolean;
  warning: boolean;
  searchAfterTimes: string[];
  bulkCreateTimes: string[];
  lastLookBackDate: Date | null | undefined;
  createdSignalsCount: number;
  createdSignals: unknown[];
  errors: string[];
  warningMessages: string[];
}

export interface ThresholdAggregationBucket extends TermAggregationBucket {
  max_timestamp: {
    value_as_string: string;
  };
  cardinality_count: {
    value: number;
  };
}

export interface MultiAggBucket {
  cardinality?: Array<{
    field: string;
    value: number;
  }>;
  terms: Array<{
    field: string;
    value: string;
  }>;
  docCount: number;
  maxTimestamp: string;
}

export interface ThresholdQueryBucket extends TermAggregationBucket {
  lastSignalTimestamp: {
    value_as_string: string;
  };
}

export interface ThresholdAlertState extends AlertTypeState {
  initialized: boolean;
  signalHistory: ThresholdSignalHistory;
}
