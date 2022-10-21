/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type moment from 'moment';
import type { ExceptionListItemSchema } from '@kbn/securitysolution-io-ts-list-types';
import type {
  RuleTypeState,
  AlertInstanceState,
  AlertInstanceContext,
  RuleExecutorOptions as AlertingRuleExecutorOptions,
  RuleExecutorServices,
} from '@kbn/alerting-plugin/server';
import type { ListClient } from '@kbn/lists-plugin/server';
import type { EcsFieldMap } from '@kbn/rule-registry-plugin/common/assets/field_maps/ecs_field_map';
import type { TypeOfFieldMap } from '@kbn/rule-registry-plugin/common/field_map';
import type { Status } from '../../../../common/detection_engine/schemas/common/schemas';
import type {
  BaseHit,
  RuleAlertAction,
  SearchTypes,
  EqlSequence,
} from '../../../../common/detection_engine/types';
import type { ITelemetryEventsSender } from '../../telemetry/sender';
import type { RuleParams } from '../rule_schema';
import type { GenericBulkCreateResponse } from '../rule_types/factories';
import type { BuildReasonMessage } from './reason_formatters';
import type {
  BaseFieldsLatest,
  DetectionAlert,
  WrappedFieldsLatest,
} from '../../../../common/detection_engine/schemas/alerts';
import type { IRuleExecutionLogForExecutors } from '../rule_monitoring';
import type { RuleResponse } from '../../../../common/detection_engine/rule_schema';
import type { EnrichEvents } from './enrichments/types';

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
      description?: string;
      false_positives?: string[];
      immutable?: boolean;
    };
    /** signal.depth was introduced in 7.10 and pre-7.10 signals do not have it. */
    depth?: number;
    original_time?: string;
    /** signal.reason was introduced in 7.15 and pre-7.15 signals do not have it. */
    reason?: string;
    status?: string;
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

export type SignalSearchResponse<
  TAggregations = Record<estypes.AggregateName, estypes.AggregationsAggregate>
> = estypes.SearchResponse<SignalSource, TAggregations>;
export type SignalSourceHit = estypes.SearchHit<SignalSource>;
export type AlertSourceHit = estypes.SearchHit<DetectionAlert>;
export type WrappedSignalHit = BaseHit<SignalHit>;
export type BaseSignalHit = estypes.SearchHit<SignalSource>;

export type RuleExecutorOptions = AlertingRuleExecutorOptions<
  RuleParams,
  RuleTypeState,
  AlertInstanceState,
  AlertInstanceContext
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
  rule: RuleResponse;
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

export type SignalsEnrichment = (signals: SignalSourceHit[]) => Promise<SignalSourceHit[]>;

export type BulkCreate = <T extends BaseFieldsLatest>(
  docs: Array<WrappedFieldsLatest<T>>,
  maxAlerts?: number,
  enrichEvents?: EnrichEvents
) => Promise<GenericBulkCreateResponse<T>>;

export type SimpleHit = BaseHit<{ '@timestamp'?: string }>;

export type WrapHits = (
  hits: Array<estypes.SearchHit<SignalSource>>,
  buildReasonMessage: BuildReasonMessage
) => Array<WrappedFieldsLatest<BaseFieldsLatest>>;

export type WrapSequences = (
  sequences: Array<EqlSequence<SignalSource>>,
  buildReasonMessage: BuildReasonMessage
) => Array<WrappedFieldsLatest<BaseFieldsLatest>>;

export type RuleServices = RuleExecutorServices<
  AlertInstanceState,
  AlertInstanceContext,
  'default'
>;
export interface SearchAfterAndBulkCreateParams {
  tuple: {
    to: moment.Moment;
    from: moment.Moment;
    maxSignals: number;
  };
  services: RuleServices;
  listClient: ListClient;
  exceptionsList: ExceptionListItemSchema[];
  ruleExecutionLogger: IRuleExecutionLogForExecutors;
  eventsTelemetry: ITelemetryEventsSender | undefined;
  inputIndexPattern: string[];
  pageSize: number;
  filter: estypes.QueryDslQueryContainer;
  buildReasonMessage: BuildReasonMessage;
  enrichment?: SignalsEnrichment;
  bulkCreate: BulkCreate;
  wrapHits: WrapHits;
  trackTotalHits?: boolean;
  sortOrder?: estypes.SortOrder;
  runtimeMappings: estypes.MappingRuntimeFields | undefined;
  primaryTimestamp: string;
  secondaryTimestamp?: string;
}

export interface SearchAfterAndBulkCreateReturnType {
  success: boolean;
  warning: boolean;
  searchAfterTimes: string[];
  enrichmentTimes: string[];
  bulkCreateTimes: string[];
  lastLookBackDate: Date | null | undefined;
  createdSignalsCount: number;
  createdSignals: unknown[];
  errors: string[];
  warningMessages: string[];
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
  minTimestamp: string;
}

export interface ThresholdAlertState extends RuleTypeState {
  initialized: boolean;
  signalHistory: ThresholdSignalHistory;
}
