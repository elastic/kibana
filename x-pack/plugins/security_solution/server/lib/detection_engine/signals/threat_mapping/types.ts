/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type {
  ThreatQuery,
  ThreatMapping,
  ThreatMappingEntries,
  ThreatIndex,
  ThreatLanguageOrUndefined,
  ConcurrentSearches,
  ItemsPerSearch,
  ThreatIndicatorPath,
  LanguageOrUndefined,
  Type,
} from '@kbn/securitysolution-io-ts-alerting-types';
import type { ExceptionListItemSchema } from '@kbn/securitysolution-io-ts-list-types';
import { SortResults } from '@elastic/elasticsearch/lib/api/types';
import { OpenPointInTimeResponse } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { ListClient } from '../../../../../../lists/server';
import {
  AlertInstanceContext,
  AlertInstanceState,
  RuleExecutorServices,
} from '../../../../../../alerting/server';
import { ElasticsearchClient, Logger } from '../../../../../../../../src/core/server';
import { ITelemetryEventsSender } from '../../../telemetry/sender';
import { BuildRuleMessage } from '../rule_messages';
import {
  BulkCreate,
  RuleRangeTuple,
  SearchAfterAndBulkCreateReturnType,
  SignalsEnrichment,
  WrapHits,
  WithTimeout,
} from '../types';
import { CompleteRule, ThreatRuleParams } from '../../schemas/rule_schemas';
import { IRuleDataClient } from '../../../../../../rule_registry/server';

export type SortOrderOrUndefined = 'asc' | 'desc' | undefined;

export interface UpdatePercolatorIndexOptions {
  esClient: ElasticsearchClient;
  exceptionItems: ExceptionListItemSchema[];
  logDebugMessage: (message: string) => void;
  percolatorRuleDataClient: IRuleDataClient;
  perPage: number;
  ruleId: string;
  ruleVersion: number;
  spaceId: string;
  threatFilters: unknown[];
  threatIndex: ThreatIndex;
  threatIndicatorPath: string;
  threatLanguage: ThreatLanguageOrUndefined;
  threatMapping: ThreatMapping;
  threatQuery: ThreatQuery;
  withTimeout: WithTimeout;
}

export interface CreateThreatSignalsOptions {
  alertId: string;
  buildRuleMessage: BuildRuleMessage;
  bulkCreate: BulkCreate;
  completeRule: CompleteRule<ThreatRuleParams>;
  concurrentSearches: ConcurrentSearches;
  eventsTelemetry: ITelemetryEventsSender | undefined;
  exceptionItems: ExceptionListItemSchema[];
  filters: unknown[];
  inputIndex: string[];
  itemsPerSearch: ItemsPerSearch;
  language: LanguageOrUndefined;
  listClient: ListClient;
  logger: Logger;
  outputIndex: string;
  query: string;
  savedId: string | undefined;
  searchAfterSize: number;
  services: RuleExecutorServices<AlertInstanceState, AlertInstanceContext, 'default'>;
  threatFilters: unknown[];
  threatIndex: ThreatIndex;
  threatIndicatorPath: ThreatIndicatorPath;
  threatLanguage: ThreatLanguageOrUndefined;
  threatMapping: ThreatMapping;
  threatQuery: ThreatQuery;
  tuple: RuleRangeTuple;
  type: Type;
  wrapHits: WrapHits;
}

export interface CreateThreatSignalOptions {
  alertId: string;
  buildRuleMessage: BuildRuleMessage;
  bulkCreate: BulkCreate;
  completeRule: CompleteRule<ThreatRuleParams>;
  currentResult: SearchAfterAndBulkCreateReturnType;
  currentThreatList: IndicatorHit[];
  eventsTelemetry: ITelemetryEventsSender | undefined;
  exceptionItems: ExceptionListItemSchema[];
  filters: unknown[];
  inputIndex: string[];
  language: LanguageOrUndefined;
  listClient: ListClient;
  logger: Logger;
  outputIndex: string;
  query: string;
  savedId: string | undefined;
  searchAfterSize: number;
  services: RuleExecutorServices<AlertInstanceState, AlertInstanceContext, 'default'>;
  threatEnrichment: SignalsEnrichment;
  threatMapping: ThreatMapping;
  tuple: RuleRangeTuple;
  type: Type;
  wrapHits: WrapHits;
}

export interface FetchSourceEventsOptions {
  alertId: string;
  buildRuleMessage: BuildRuleMessage;
  bulkCreate: BulkCreate;
  completeRule: CompleteRule<ThreatRuleParams>;
  currentResult: SearchAfterAndBulkCreateReturnType;
  currentThreatList: IndicatorHit[];
  eventsTelemetry: ITelemetryEventsSender | undefined;
  exceptionItems: ExceptionListItemSchema[];
  filters: unknown[];
  inputIndex: string[];
  language: LanguageOrUndefined;
  listClient: ListClient;
  logger: Logger;
  outputIndex: string;
  query: string;
  savedId: string | undefined;
  searchAfterSize: number;
  services: RuleExecutorServices<AlertInstanceState, AlertInstanceContext, 'default'>;
  threatEnrichment: SignalsEnrichment;
  threatMapping: ThreatMapping;
  tuple: RuleRangeTuple;
  type: Type;
  wrapHits: WrapHits;
}

export interface CreateEventSignalOptions {
  alertId: string;
  buildRuleMessage: BuildRuleMessage;
  bulkCreate: BulkCreate;
  completeRule: CompleteRule<ThreatRuleParams>;
  currentResult: SearchAfterAndBulkCreateReturnType;
  currentEventList: EventItem[];
  eventsTelemetry: ITelemetryEventsSender | undefined;
  exceptionItems: ExceptionListItemSchema[];
  filters: unknown[];
  inputIndex: string[];
  language: LanguageOrUndefined;
  listClient: ListClient;
  logger: Logger;
  outputIndex: string;
  query: string;
  savedId: string | undefined;
  searchAfterSize: number;
  services: RuleExecutorServices<AlertInstanceState, AlertInstanceContext, 'default'>;
  threatEnrichment: SignalsEnrichment;
  tuple: RuleRangeTuple;
  type: Type;
  wrapHits: WrapHits;
  threatFilters: unknown[];
  threatIndex: ThreatIndex;
  threatIndicatorPath: ThreatIndicatorPath;
  threatLanguage: ThreatLanguageOrUndefined;
  threatMapping: ThreatMapping;
  threatQuery: ThreatQuery;
  perPage?: number;
  threatPitId: OpenPointInTimeResponse['id'];
  reassignThreatPitId: (newPitId: OpenPointInTimeResponse['id'] | undefined) => void;
}

type EntryKey = 'field' | 'value';
export interface BuildThreatMappingFilterOptions {
  chunkSize?: number;
  threatList: IndicatorHit[];
  threatMapping: ThreatMapping;
  entryKey: EntryKey;
}

export interface FilterThreatMappingOptions {
  indicator: IndicatorHit;
  threatMapping: ThreatMapping;
  entryKey: EntryKey;
}

export interface CreateInnerAndClausesOptions {
  indicator: IndicatorHit;
  threatMappingEntries: ThreatMappingEntries;
  entryKey: EntryKey;
}

export interface CreateAndOrClausesOptions {
  indicator: IndicatorHit;
  threatMapping: ThreatMapping;
  entryKey: EntryKey;
}

export interface BuildEntriesMappingFilterOptions {
  chunkSize: number;
  threatList: IndicatorHit[];
  threatMapping: ThreatMapping;
  entryKey: EntryKey;
}

export interface CreatePercolateQueriesOptions {
  ruleId: string;
  ruleVersion: number;
  threatList: Array<estypes.SearchHit<ThreatListDoc>>;
  threatMapping: ThreatMapping;
  threatIndicatorPath: string;
}

export interface SplitShouldClausesOptions {
  chunkSize: number;
  should: BooleanFilter[];
}

export interface BooleanFilter {
  bool: { should: unknown[]; minimum_should_match: number };
}

export interface ThreatListConfig {
  _source: string[] | boolean;
  fields: string[] | undefined;
  sort?: estypes.Sort;
}

export interface PercolatorQuery {
  bool: { must: unknown[]; should: unknown[]; minimum_should_match: number };
  enrichments?: ThreatEnrichment[];
  id?: string;
}

export interface GetNextPageOptions {
  esClient: ElasticsearchClient;
  exceptionItems: ExceptionListItemSchema[];
  filters: unknown[];
  index: string[];
  language: LanguageOrUndefined;
  logDebugMessage: (message: string) => void;
  perPage?: number;
  query: string;
  searchAfter: SortResults | undefined;
  threatListConfig: ThreatListConfig;
}

export interface CreatePercolatorQueriesOptions {
  esClient: ElasticsearchClient;
  exceptionItems: ExceptionListItemSchema[];
  logDebugMessage: (message: string) => void;
  perPage?: number;
  ruleId: string;
  ruleVersion: number;
  searchAfter: SortResults | undefined;
  threatFilters: unknown[];
  threatIndex: ThreatIndex;
  threatIndicatorPath: string;
  threatLanguage: ThreatLanguageOrUndefined;
  threatMapping: ThreatMapping;
  threatQuery: ThreatQuery;
  // pitId: OpenPointInTimeResponse['id'];
  // reassignPitId: (newPitId: OpenPointInTimeResponse['id'] | undefined) => void;
}

export interface FetchItemsOptions<T> {
  esClient: ElasticsearchClient;
  exceptionItems: ExceptionListItemSchema[];
  filters: unknown[];
  index: ThreatIndex;
  itemType: string;
  language: ThreatLanguageOrUndefined;
  logDebugMessage: (message: string) => void;
  perPage?: number;
  query: ThreatQuery;
  searchAfter?: SortResults;
  timestampOverride?: string;
  transformHits: (hits: EventHit[]) => T[];
  tuple?: RuleRangeTuple;
}

export interface EventDoc {
  [key: string]: unknown;
  fields?: Record<string, string[]>;
}

export interface ThreatListDoc extends EventDoc {
  threat?: {
    feed?: {
      name?: string;
    };
    [key: string]: unknown;
  };
}

export type SourceEventDoc = EventDoc;

/**
 * This is an ECS document being returned, but the user could return or use non-ecs based
 * documents potentially.
 */
export type EventHit = estypes.SearchHit<EventDoc>;
export type IndicatorHit = estypes.SearchHit<ThreatListDoc>;

export interface ThreatEnrichment {
  feed: Record<string, unknown>;
  indicator: unknown;
  matched: { id: string; index: string; field: string; atomic?: string; type: string };
}

export interface SortWithTieBreaker {
  [key: string]: string;
}

export interface ThreatMatchNamedQuery {
  id: string;
  index: string;
  field: string;
  value: string;
}

export type GetMatchedThreats = (ids: string[]) => Promise<IndicatorHit[]>;

export interface BuildThreatEnrichmentOptions {
  exceptionItems: ExceptionListItemSchema[];
  logDebugMessage: (message: string) => void;
  services: RuleExecutorServices<AlertInstanceState, AlertInstanceContext, 'default'>;
  threatFilters: unknown[];
  threatIndex: ThreatIndex;
  threatIndicatorPath: ThreatIndicatorPath;
  threatLanguage: ThreatLanguageOrUndefined;
  threatQuery: ThreatQuery;
  pitId: string;
  reassignPitId: (newPitId: OpenPointInTimeResponse['id'] | undefined) => void;
}

export interface EventsOptions {
  services: RuleExecutorServices<AlertInstanceState, AlertInstanceContext, 'default'>;
  query: string;
  buildRuleMessage: BuildRuleMessage;
  language: ThreatLanguageOrUndefined;
  exceptionItems: ExceptionListItemSchema[];
  index: string[];
  searchAfter: estypes.SortResults | undefined;
  perPage?: number;
  logger: Logger;
  filters: unknown[];
  timestampOverride?: string;
  tuple: RuleRangeTuple;
}

export type EventItem = estypes.SearchHit<EventDoc>;
export interface EventCountOptions {
  esClient: ElasticsearchClient;
  exceptionItems: ExceptionListItemSchema[];
  index: string[];
  language: ThreatLanguageOrUndefined;
  query: string;
  filters: unknown[];
  tuple?: RuleRangeTuple;
  timestampOverride?: string;
}

export interface SignalMatch {
  signalId: string;
  queries: ThreatMatchNamedQuery[];
}

export type GetDocumentListInterface = (params: {
  searchAfter: estypes.SortResults | undefined;
}) => Promise<estypes.SearchResponse<EventDoc | ThreatListDoc>>;

export type CreateSignalInterface = (
  params: EventItem[] | IndicatorHit[]
) => Promise<SearchAfterAndBulkCreateReturnType>;
