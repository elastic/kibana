/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Duration } from 'moment';
import { SearchResponse } from 'elasticsearch';
import { ListClient } from '../../../../../../lists/server';

import {
  Type,
  LanguageOrUndefined,
  ThreatQuery,
  ThreatMapping,
  ThreatMappingEntries,
} from '../../../../../common/detection_engine/schemas/common/schemas';
import { PartialFilter, RuleTypeParams } from '../../types';
import { AlertServices } from '../../../../../../alerts/server';
import { ExceptionListItemSchema } from '../../../../../../lists/common/schemas';
import { SearchAfterAndBulkCreateReturnType } from '../search_after_bulk_create';
import { ILegacyScopedClusterClient, Logger } from '../../../../../../../../src/core/server';
import { RuleAlertAction } from '../../../../../common/detection_engine/types';
import { BuildRuleMessage } from '../rule_messages';

export interface CreateThreatSignalsOptions {
  threatMapping: ThreatMapping;
  query: string;
  inputIndex: string[];
  type: Type;
  filters: PartialFilter[];
  language: LanguageOrUndefined;
  savedId: string | undefined;
  services: AlertServices;
  exceptionItems: ExceptionListItemSchema[];
  gap: Duration | null;
  previousStartedAt: Date | null;
  listClient: ListClient | undefined;
  logger: Logger;
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
  threatIndex: string;
  name: string;
}

export interface CreateThreatSignalOptions {
  threatMapping: ThreatMapping;
  query: string;
  inputIndex: string[];
  type: Type;
  filters: PartialFilter[];
  language: LanguageOrUndefined;
  savedId: string | undefined;
  services: AlertServices;
  exceptionItems: ExceptionListItemSchema[];
  gap: Duration | null;
  previousStartedAt: Date | null;
  listClient: ListClient | undefined;
  logger: Logger;
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
  threatIndex: string;
  name: string;
  currentThreatList: SearchResponse<ThreatListItem>;
  currentResult: SearchAfterAndBulkCreateReturnType;
}

export interface BuildThreatMappingFilterOptions {
  threatMapping: ThreatMapping;
  threatList: SearchResponse<ThreatListItem>;
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
  threatList: SearchResponse<ThreatListItem>;
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
  callCluster: ILegacyScopedClusterClient['callAsCurrentUser'];
  query: string;
  index: string[];
  perPage?: number;
  searchAfter: string[] | undefined;
  sortField: string | undefined;
  sortOrder: 'asc' | 'desc' | undefined;
  threatFilters: PartialFilter[];
  exceptionItems: ExceptionListItemSchema[];
}

export interface GetSortWithTieBreakerOptions {
  sortField: string | undefined;
  sortOrder: 'asc' | 'desc' | undefined;
}

/**
 * This is an ECS document being returned, but the user could return or use non-ecs based
 * documents potentially.
 */
export interface ThreatListItem {
  [key: string]: unknown;
}

export interface SortWithTieBreaker {
  '@timestamp': 'asc';
  [key: string]: string;
}
