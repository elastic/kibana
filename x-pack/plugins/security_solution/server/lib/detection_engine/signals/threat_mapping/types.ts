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
import { ListClient } from '../../../../../../lists/server';
import {
  AlertInstanceContext,
  AlertInstanceState,
  AlertServices,
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
} from '../types';
import { CompleteRule, ThreatRuleParams } from '../../schemas/rule_schemas';

export type SortOrderOrUndefined = 'asc' | 'desc' | undefined;

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
  currentThreatList: ThreatListItem[];
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
  threatList: ThreatListItem[];
  threatMapping: ThreatMapping;
}

export interface FilterThreatMappingOptions {
  threatListItem: ThreatListItem;
  threatMapping: ThreatMapping;
}

export interface CreateInnerAndClausesOptions {
  threatListItem: ThreatListItem;
  threatMappingEntries: ThreatMappingEntries;
}

export interface CreateAndOrClausesOptions {
  threatListItem: ThreatListItem;
  threatMapping: ThreatMapping;
}

export interface BuildEntriesMappingFilterOptions {
  chunkSize: number;
  threatList: ThreatListItem[];
  threatMapping: ThreatMapping;
}

export interface SplitShouldClausesOptions {
  chunkSize: number;
  should: BooleanFilter[];
}

export interface BooleanFilter {
  bool: { should: unknown[]; minimum_should_match: number };
}

export interface GetThreatListOptions {
  buildRuleMessage: BuildRuleMessage;
  esClient: ElasticsearchClient;
  exceptionItems: ExceptionListItemSchema[];
  index: string[];
  language: ThreatLanguageOrUndefined;
  listClient: ListClient;
  logger: Logger;
  perPage?: number;
  query: string;
  searchAfter: string[] | undefined;
  sortField: string | undefined;
  sortOrder: SortOrderOrUndefined;
  threatFilters: unknown[];
}

export interface ThreatListCountOptions {
  esClient: ElasticsearchClient;
  exceptionItems: ExceptionListItemSchema[];
  index: string[];
  language: ThreatLanguageOrUndefined;
  query: string;
  threatFilters: unknown[];
}

export interface GetSortWithTieBreakerOptions {
  index: string[];
  listItemIndex: string;
  sortField: string | undefined;
  sortOrder: SortOrderOrUndefined;
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

export type GetMatchedThreats = (ids: string[]) => Promise<ThreatListItem[]>;

export interface BuildThreatEnrichmentOptions {
  buildRuleMessage: BuildRuleMessage;
  exceptionItems: ExceptionListItemSchema[];
  listClient: ListClient;
  logger: Logger;
  services: AlertServices<AlertInstanceState, AlertInstanceContext, 'default'>;
  threatFilters: unknown[];
  threatIndex: ThreatIndex;
  threatIndicatorPath: ThreatIndicatorPathOrUndefined;
  threatLanguage: ThreatLanguageOrUndefined;
  threatQuery: ThreatQuery;
}

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
