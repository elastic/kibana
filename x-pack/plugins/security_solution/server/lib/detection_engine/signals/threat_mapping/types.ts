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
  ThreatIndicatorPathOrUndefined,
  LanguageOrUndefined,
  Type,
} from '@kbn/securitysolution-io-ts-alerting-types';
import type { ExceptionListItemSchema } from '@kbn/securitysolution-io-ts-list-types';
import { SortResults } from '@elastic/elasticsearch/lib/api/types';
import { ListClient } from '../../../../../../lists/server';
import {
  AlertInstanceContext,
  AlertInstanceState,
  AlertServices,
  IAbortableEsClient,
} from '../../../../../../alerting/server';
import { ElasticsearchClient, Logger } from '../../../../../../../../src/core/server';
import { TelemetryEventsSender } from '../../../telemetry/sender';
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
  abortableEsClient: IAbortableEsClient;
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
  threatLanguage: ThreatLanguageOrUndefined;
  threatMapping: ThreatMapping;
  threatQuery: ThreatQuery;
  timestampOverride?: string;
  withTimeout: WithTimeout;
}

export interface CreateThreatSignalsOptions {
  alertId: string;
  buildRuleMessage: BuildRuleMessage;
  bulkCreate: BulkCreate;
  completeRule: CompleteRule<ThreatRuleParams>;
  concurrentSearches: ConcurrentSearches;
  eventsTelemetry: TelemetryEventsSender | undefined;
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
  services: AlertServices<AlertInstanceState, AlertInstanceContext, 'default'>;
  threatFilters: unknown[];
  threatIndex: ThreatIndex;
  threatIndicatorPath: ThreatIndicatorPathOrUndefined;
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
  eventsTelemetry: TelemetryEventsSender | undefined;
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
  services: AlertServices<AlertInstanceState, AlertInstanceContext, 'default'>;
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
  eventsTelemetry: TelemetryEventsSender | undefined;
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
  services: AlertServices<AlertInstanceState, AlertInstanceContext, 'default'>;
  threatEnrichment: SignalsEnrichment;
  threatMapping: ThreatMapping;
  tuple: RuleRangeTuple;
  type: Type;
  wrapHits: WrapHits;
}

export interface BuildThreatMappingFilterOptions {
  chunkSize?: number;
  threatList: IndicatorHit[];
  threatMapping: ThreatMapping;
}

export interface FilterThreatMappingOptions {
  indicator: IndicatorHit;
  threatMapping: ThreatMapping;
}

export interface CreateInnerAndClausesOptions {
  indicator: IndicatorHit;
  threatMappingEntries: ThreatMappingEntries;
}

export interface CreateAndOrClausesOptions {
  indicator: IndicatorHit;
  threatMapping: ThreatMapping;
}

export interface BuildEntriesMappingFilterOptions {
  chunkSize: number;
  threatList: IndicatorHit[];
  threatMapping: ThreatMapping;
}

export interface CreatePercolateQueriesOptions {
  ruleId: string;
  ruleVersion: number;
  threatList: Array<estypes.SearchHit<EventDoc>>;
  threatMapping: ThreatMapping;
}

export interface SplitShouldClausesOptions {
  chunkSize: number;
  should: BooleanFilter[];
}

export interface BooleanFilter {
  bool: { should: unknown[]; minimum_should_match: number };
}

export interface PercolatorQuery {
  bool: { must: unknown[]; filter?: unknown[]; should?: unknown[]; minimum_should_match: number };
  _name?: string;
  indicator?: IndicatorHit;
}

export interface GetNextPageOptions {
  abortableEsClient: IAbortableEsClient;
  exceptionItems: ExceptionListItemSchema[];
  filters: unknown[];
  index: string[];
  language: LanguageOrUndefined;
  logDebugMessage: (message: string) => void;
  perPage?: number;
  query: string;
  searchAfter: SortResults | undefined;
  sortOrder: 'asc' | 'desc';
  timestampOverride?: string;
  tuple?: RuleRangeTuple;
}

export interface CreatePercolatorQueriesOptions {
  abortableEsClient: IAbortableEsClient;
  exceptionItems: ExceptionListItemSchema[];
  logDebugMessage: (message: string) => void;
  perPage?: number;
  ruleId: string;
  ruleVersion: number;
  searchAfter: SortResults | undefined;
  threatFilters: unknown[];
  threatIndex: ThreatIndex;
  threatLanguage: ThreatLanguageOrUndefined;
  threatMapping: ThreatMapping;
  threatQuery: ThreatQuery;
  timestampOverride?: string;
}

export interface FetchItemsOptions<T> {
  abortableEsClient: IAbortableEsClient;
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

export interface GetSortWithTieBreakerOptions {
  index: string[];
  listItemIndex: string;
  sortField: string | undefined;
  sortOrder: SortOrderOrUndefined;
}

export interface EventDoc {
  [key: string]: unknown;
}

export type ThreatListDoc = EventDoc;
export type SourceEventDoc = EventDoc;

/**
 * This is an ECS document being returned, but the user could return or use non-ecs based
 * documents potentially.
 */
export type EventHit = estypes.SearchHit<EventDoc>;
export type IndicatorHit = estypes.SearchHit<ThreatListDoc>;

export interface ThreatEnrichment {
  feed: Record<string, unknown>;
  indicator: Record<string, unknown>;
  matched: Record<string, unknown>;
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
  services: AlertServices<AlertInstanceState, AlertInstanceContext, 'default'>;
  threatFilters: unknown[];
  threatIndex: ThreatIndex;
  threatIndicatorPath: ThreatIndicatorPathOrUndefined;
  threatLanguage: ThreatLanguageOrUndefined;
  threatQuery: ThreatQuery;
}
