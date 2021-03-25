/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SearchResponse } from 'elasticsearch';

import { ListClient } from '../../../../../../lists/server';
import {
  Type,
  LanguageOrUndefined,
} from '../../../../../common/detection_engine/schemas/common/schemas';
import {
  ThreatQuery,
  ThreatMapping,
  ThreatMappingEntries,
  ThreatIndex,
  ThreatLanguageOrUndefined,
  ConcurrentSearches,
  ItemsPerSearch,
  ThreatIndicatorPathOrUndefined,
} from '../../../../../common/detection_engine/schemas/types/threat_mapping';
import { PartialFilter, RuleTypeParams } from '../../types';
import {
  AlertInstanceContext,
  AlertInstanceState,
  AlertServices,
} from '../../../../../../alerting/server';
import { ExceptionListItemSchema } from '../../../../../../lists/common/schemas';
import { ElasticsearchClient, Logger } from '../../../../../../../../src/core/server';
import { RuleAlertAction } from '../../../../../common/detection_engine/types';
import { TelemetryEventsSender } from '../../../telemetry/sender';
import { BuildRuleMessage } from '../rule_messages';
import { RuleRangeTuple, SearchAfterAndBulkCreateReturnType, SignalsEnrichment } from '../types';

export type SortOrderOrUndefined = 'asc' | 'desc' | undefined;

export interface CreateThreatSignalsOptions {
  tuples: RuleRangeTuple[];
  threatMapping: ThreatMapping;
  query: string;
  inputIndex: string[];
  type: Type;
  filters: PartialFilter[];
  language: LanguageOrUndefined;
  savedId: string | undefined;
  services: AlertServices<AlertInstanceState, AlertInstanceContext, 'default'>;
  exceptionItems: ExceptionListItemSchema[];
  listClient: ListClient;
  logger: Logger;
  eventsTelemetry: TelemetryEventsSender | undefined;
  alertId: string;
  outputIndex: string;
  params: RuleTypeParams;
  searchAfterSize: number;
  actions: RuleAlertAction[];
  createdBy: string;
  createdAt: string;
  updatedBy: string;
  updatedAt: string;
  interval: string;
  enabled: boolean;
  tags: string[];
  refresh: false | 'wait_for';
  throttle: string;
  threatFilters: PartialFilter[];
  threatQuery: ThreatQuery;
  buildRuleMessage: BuildRuleMessage;
  threatIndex: ThreatIndex;
  threatIndicatorPath: ThreatIndicatorPathOrUndefined;
  threatLanguage: ThreatLanguageOrUndefined;
  name: string;
  concurrentSearches: ConcurrentSearches;
  itemsPerSearch: ItemsPerSearch;
}

export interface CreateThreatSignalOptions {
  tuples: RuleRangeTuple[];
  threatMapping: ThreatMapping;
  threatEnrichment: SignalsEnrichment;
  query: string;
  inputIndex: string[];
  type: Type;
  filters: PartialFilter[];
  language: LanguageOrUndefined;
  savedId: string | undefined;
  services: AlertServices<AlertInstanceState, AlertInstanceContext, 'default'>;
  exceptionItems: ExceptionListItemSchema[];
  listClient: ListClient;
  logger: Logger;
  eventsTelemetry: TelemetryEventsSender | undefined;
  alertId: string;
  outputIndex: string;
  params: RuleTypeParams;
  searchAfterSize: number;
  actions: RuleAlertAction[];
  createdBy: string;
  createdAt: string;
  updatedBy: string;
  updatedAt: string;
  interval: string;
  enabled: boolean;
  tags: string[];
  refresh: false | 'wait_for';
  throttle: string;
  buildRuleMessage: BuildRuleMessage;
  name: string;
  currentThreatList: ThreatListItem[];
  currentResult: SearchAfterAndBulkCreateReturnType;
}

export interface BuildThreatMappingFilterOptions {
  threatMapping: ThreatMapping;
  threatList: ThreatListItem[];
  chunkSize?: number;
}

export interface FilterThreatMappingOptions {
  threatMapping: ThreatMapping;
  threatListItem: ThreatListItem;
}

export interface CreateInnerAndClausesOptions {
  threatMappingEntries: ThreatMappingEntries;
  threatListItem: ThreatListItem;
}

export interface CreateAndOrClausesOptions {
  threatMapping: ThreatMapping;
  threatListItem: ThreatListItem;
}

export interface BuildEntriesMappingFilterOptions {
  threatMapping: ThreatMapping;
  threatList: ThreatListItem[];
  chunkSize: number;
}

export interface SplitShouldClausesOptions {
  should: BooleanFilter[];
  chunkSize: number;
}

export interface BooleanFilter {
  bool: { should: unknown[]; minimum_should_match: number };
}

export interface GetThreatListOptions {
  esClient: ElasticsearchClient;
  query: string;
  language: ThreatLanguageOrUndefined;
  index: string[];
  perPage?: number;
  searchAfter: string[] | undefined;
  sortField: string | undefined;
  sortOrder: SortOrderOrUndefined;
  threatFilters: PartialFilter[];
  exceptionItems: ExceptionListItemSchema[];
  listClient: ListClient;
  buildRuleMessage: BuildRuleMessage;
  logger: Logger;
}

export interface ThreatListCountOptions {
  esClient: ElasticsearchClient;
  query: string;
  language: ThreatLanguageOrUndefined;
  threatFilters: PartialFilter[];
  index: string[];
  exceptionItems: ExceptionListItemSchema[];
}

export interface GetSortWithTieBreakerOptions {
  sortField: string | undefined;
  sortOrder: SortOrderOrUndefined;
  index: string[];
  listItemIndex: string;
}

export interface ThreatListDoc {
  [key: string]: unknown;
}

/**
 * This is an ECS document being returned, but the user could return or use non-ecs based
 * documents potentially.
 */
export type ThreatListItem = SearchResponse<ThreatListDoc>['hits']['hits'][number];

export interface ThreatIndicator {
  [key: string]: unknown;
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
  threatFilters: PartialFilter[];
  threatIndex: ThreatIndex;
  threatIndicatorPath: ThreatIndicatorPathOrUndefined;
  threatLanguage: ThreatLanguageOrUndefined;
  threatQuery: ThreatQuery;
}
