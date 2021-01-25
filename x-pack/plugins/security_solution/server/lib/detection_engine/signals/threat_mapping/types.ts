/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Duration } from 'moment';
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
} from '../../../../../common/detection_engine/schemas/types/threat_mapping';
import { PartialFilter, RuleTypeParams } from '../../types';
import {
  AlertInstanceContext,
  AlertInstanceState,
  AlertServices,
} from '../../../../../../alerts/server';
import { ExceptionListItemSchema } from '../../../../../../lists/common/schemas';
import { ILegacyScopedClusterClient, Logger } from '../../../../../../../../src/core/server';
import { RuleAlertAction } from '../../../../../common/detection_engine/types';
import { TelemetryEventsSender } from '../../../telemetry/sender';
import { BuildRuleMessage } from '../rule_messages';
import { SearchAfterAndBulkCreateReturnType } from '../types';

export type SortOrderOrUndefined = 'asc' | 'desc' | undefined;

export interface CreateThreatSignalsOptions {
  threatMapping: ThreatMapping;
  query: string;
  inputIndex: string[];
  type: Type;
  filters: PartialFilter[];
  language: LanguageOrUndefined;
  savedId: string | undefined;
  services: AlertServices<AlertInstanceState, AlertInstanceContext, 'default'>;
  exceptionItems: ExceptionListItemSchema[];
  gap: Duration | null;
  previousStartedAt: Date | null;
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
  threatLanguage: ThreatLanguageOrUndefined;
  name: string;
  concurrentSearches: ConcurrentSearches;
  itemsPerSearch: ItemsPerSearch;
}

export interface CreateThreatSignalOptions {
  threatMapping: ThreatMapping;
  query: string;
  inputIndex: string[];
  type: Type;
  filters: PartialFilter[];
  language: LanguageOrUndefined;
  savedId: string | undefined;
  services: AlertServices<AlertInstanceState, AlertInstanceContext, 'default'>;
  exceptionItems: ExceptionListItemSchema[];
  gap: Duration | null;
  previousStartedAt: Date | null;
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
  callCluster: ILegacyScopedClusterClient['callAsCurrentUser'];
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
  callCluster: ILegacyScopedClusterClient['callAsCurrentUser'];
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

/**
 * This is an ECS document being returned, but the user could return or use non-ecs based
 * documents potentially.
 */
export interface ThreatListItem {
  [key: string]: unknown;
}

export interface SortWithTieBreaker {
  [key: string]: string;
}
