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
import type { OpenPointInTimeResponse } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type { ListClient } from '@kbn/lists-plugin/server';
import type {
  AlertInstanceContext,
  AlertInstanceState,
  RuleExecutorServices,
} from '@kbn/alerting-plugin/server';
import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { ITelemetryEventsSender } from '../../../telemetry/sender';
import type { BuildRuleMessage } from '../rule_messages';
import type {
  BulkCreate,
  RuleRangeTuple,
  SearchAfterAndBulkCreateReturnType,
  SignalsEnrichment,
  WrapHits,
} from '../types';
import type { CompleteRule, ThreatRuleParams } from '../../schemas/rule_schemas';

export type SortOrderOrUndefined = 'asc' | 'desc' | undefined;

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
  runtimeMappings: estypes.MappingRuntimeFields | undefined;
}

export interface CreateThreatSignalOptions {
  alertId: string;
  buildRuleMessage: BuildRuleMessage;
  bulkCreate: BulkCreate;
  completeRule: CompleteRule<ThreatRuleParams>;
  currentResult: SearchAfterAndBulkCreateReturnType;
  currentThreatList: ThreatListItem[];
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
  runtimeMappings: estypes.MappingRuntimeFields | undefined;
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
  runtimeMappings: estypes.MappingRuntimeFields | undefined;
}

type EntryKey = 'field' | 'value';
export interface BuildThreatMappingFilterOptions {
  chunkSize?: number;
  threatList: ThreatListItem[];
  threatMapping: ThreatMapping;
  entryKey: EntryKey;
}

export interface FilterThreatMappingOptions {
  threatListItem: ThreatListItem;
  threatMapping: ThreatMapping;
  entryKey: EntryKey;
}

export interface CreateInnerAndClausesOptions {
  threatListItem: ThreatListItem;
  threatMappingEntries: ThreatMappingEntries;
  entryKey: EntryKey;
}

export interface CreateAndOrClausesOptions {
  threatListItem: ThreatListItem;
  threatMapping: ThreatMapping;
  entryKey: EntryKey;
}

export interface BuildEntriesMappingFilterOptions {
  chunkSize: number;
  threatList: ThreatListItem[];
  threatMapping: ThreatMapping;
  entryKey: EntryKey;
}

export interface SplitShouldClausesOptions {
  chunkSize: number;
  should: BooleanFilter[];
}

export interface BooleanFilter {
  bool: { should: unknown[]; minimum_should_match: number };
}

interface ThreatListConfig {
  _source: string[] | boolean;
  fields: string[] | undefined;
}

export interface GetThreatListOptions {
  buildRuleMessage: BuildRuleMessage;
  esClient: ElasticsearchClient;
  exceptionItems: ExceptionListItemSchema[];
  index: string[];
  language: ThreatLanguageOrUndefined;
  logger: Logger;
  perPage?: number;
  query: string;
  searchAfter: estypes.SortResults | undefined;
  threatFilters: unknown[];
  threatListConfig: ThreatListConfig;
  pitId: OpenPointInTimeResponse['id'];
  reassignPitId: (newPitId: OpenPointInTimeResponse['id'] | undefined) => void;
  runtimeMappings: estypes.MappingRuntimeFields | undefined;
  listClient: ListClient;
}

export interface ThreatListCountOptions {
  esClient: ElasticsearchClient;
  exceptionItems: ExceptionListItemSchema[];
  index: string[];
  language: ThreatLanguageOrUndefined;
  query: string;
  threatFilters: unknown[];
}

export interface ThreatListDoc {
  [key: string]: unknown;
}

/**
 * This is an ECS document being returned, but the user could return or use non-ecs based
 * documents potentially.
 */
export type ThreatListItem = estypes.SearchHit<ThreatListDoc>;

export interface ThreatEnrichment {
  feed: Record<string, unknown>;
  indicator: Record<string, unknown>;
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

export type GetMatchedThreats = (ids: string[]) => Promise<ThreatListItem[]>;

export interface BuildThreatEnrichmentOptions {
  buildRuleMessage: BuildRuleMessage;
  exceptionItems: ExceptionListItemSchema[];
  logger: Logger;
  services: RuleExecutorServices<AlertInstanceState, AlertInstanceContext, 'default'>;
  threatFilters: unknown[];
  threatIndex: ThreatIndex;
  threatIndicatorPath: ThreatIndicatorPath;
  threatLanguage: ThreatLanguageOrUndefined;
  threatQuery: ThreatQuery;
  pitId: string;
  reassignPitId: (newPitId: OpenPointInTimeResponse['id'] | undefined) => void;
  listClient: ListClient;
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
  runtimeMappings: estypes.MappingRuntimeFields | undefined;
}

export interface EventDoc {
  [key: string]: unknown;
}

export type EventItem = estypes.SearchHit<EventDoc>;
export interface EventCountOptions {
  esClient: ElasticsearchClient;
  exceptionItems: ExceptionListItemSchema[];
  index: string[];
  language: ThreatLanguageOrUndefined;
  query: string;
  filters: unknown[];
  tuple: RuleRangeTuple;
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
  params: EventItem[] | ThreatListItem[]
) => Promise<SearchAfterAndBulkCreateReturnType>;

export interface GetSortForThreatList {
  index: string[];
  listItemIndex: string;
}
