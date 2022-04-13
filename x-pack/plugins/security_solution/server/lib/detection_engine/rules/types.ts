/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Readable } from 'stream';

import { SavedObjectAttributes, SavedObjectsClientContract } from 'kibana/server';
import type {
  MachineLearningJobIdOrUndefined,
  From,
  FromOrUndefined,
  RiskScore,
  RiskScoreMapping,
  RiskScoreMappingOrUndefined,
  RiskScoreOrUndefined,
  ThreatIndexOrUndefined,
  ThreatQueryOrUndefined,
  ThreatMappingOrUndefined,
  ThreatFiltersOrUndefined,
  ThreatLanguageOrUndefined,
  ConcurrentSearchesOrUndefined,
  ItemsPerSearchOrUndefined,
  ThreatIndicatorPathOrUndefined,
  Threats,
  ThreatsOrUndefined,
  TypeOrUndefined,
  Type,
  LanguageOrUndefined,
  SeverityMapping,
  SeverityMappingOrUndefined,
  SeverityOrUndefined,
  Severity,
  MaxSignalsOrUndefined,
  MaxSignals,
  ThrottleOrUndefinedOrNull,
  ThrottleOrNull,
} from '@kbn/securitysolution-io-ts-alerting-types';
import type { VersionOrUndefined, Version } from '@kbn/securitysolution-io-ts-types';
import { SIGNALS_ID, ruleTypeMappings } from '@kbn/securitysolution-rules';

import type { ListArrayOrUndefined, ListArray } from '@kbn/securitysolution-io-ts-list-types';
import { UpdateRulesSchema } from '../../../../common/detection_engine/schemas/request';
import { RuleAlertAction } from '../../../../common/detection_engine/types';
import {
  FalsePositives,
  RuleId,
  Immutable,
  DescriptionOrUndefined,
  Interval,
  OutputIndex,
  Name,
  Tags,
  To,
  References,
  AnomalyThresholdOrUndefined,
  QueryOrUndefined,
  SavedIdOrUndefined,
  TimelineIdOrUndefined,
  TimelineTitleOrUndefined,
  IndexOrUndefined,
  NoteOrUndefined,
  MetaOrUndefined,
  Description,
  Enabled,
  Id,
  IdOrUndefined,
  RuleIdOrUndefined,
  EnabledOrUndefined,
  FalsePositivesOrUndefined,
  OutputIndexOrUndefined,
  IntervalOrUndefined,
  NameOrUndefined,
  TagsOrUndefined,
  ToOrUndefined,
  ThresholdOrUndefined,
  ReferencesOrUndefined,
  PerPageOrUndefined,
  PageOrUndefined,
  SortFieldOrUndefined,
  QueryFilterOrUndefined,
  FieldsOrUndefined,
  SortOrderOrUndefined,
  Author,
  AuthorOrUndefined,
  LicenseOrUndefined,
  TimestampOverrideOrUndefined,
  BuildingBlockTypeOrUndefined,
  RuleNameOverrideOrUndefined,
  EventCategoryOverrideOrUndefined,
  NamespaceOrUndefined,
} from '../../../../common/detection_engine/schemas/common';

import { RulesClient, PartialRule, BulkEditOperation, RuleTypeParams } from '../../../../../alerting/server';
import { SanitizedRule } from '../../../../../alerting/common';
import { PartialFilter } from '../types';
import { RuleParams } from '../schemas/rule_schemas';
import { IRuleExecutionLogForRoutes } from '../rule_execution_log';

export type RuleAlertType = SanitizedRule<RuleParams>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface IRuleAssetSOAttributes extends Record<string, any> {
  rule_id: string | null | undefined;
  version: string | null | undefined;
  name: string | null | undefined;
}

export interface IRuleAssetSavedObject {
  type: string;
  id: string;
  attributes: IRuleAssetSOAttributes & SavedObjectAttributes;
}

export interface HapiReadableStream extends Readable {
  hapi: {
    filename: string;
  };
}

export interface Clients {
  rulesClient: RulesClient;
}

export const isAlertTypes = (
  isRuleRegistryEnabled: boolean,
  partialAlert: Array<PartialRule<RuleParams>>
): partialAlert is RuleAlertType[] => {
  return partialAlert.every((rule) => isAlertType(isRuleRegistryEnabled, rule));
};

export const isAlertType = (
  isRuleRegistryEnabled: boolean,
  partialAlert: PartialRule<RuleParams>
): partialAlert is RuleAlertType => {
  const ruleTypeValues = Object.values(ruleTypeMappings) as unknown as string[];
  return isRuleRegistryEnabled
    ? ruleTypeValues.includes(partialAlert.alertTypeId as string)
    : partialAlert.alertTypeId === SIGNALS_ID;
};

export interface CreateRulesOptions {
  rulesClient: RulesClient;
  anomalyThreshold: AnomalyThresholdOrUndefined;
  author: Author;
  buildingBlockType: BuildingBlockTypeOrUndefined;
  description: Description;
  enabled: Enabled;
  eventCategoryOverride: EventCategoryOverrideOrUndefined;
  falsePositives: FalsePositives;
  from: From;
  query: QueryOrUndefined;
  language: LanguageOrUndefined;
  savedId: SavedIdOrUndefined;
  timelineId: TimelineIdOrUndefined;
  timelineTitle: TimelineTitleOrUndefined;
  meta: MetaOrUndefined;
  machineLearningJobId: MachineLearningJobIdOrUndefined;
  filters: PartialFilter[];
  ruleId: RuleId;
  immutable: Immutable;
  index: IndexOrUndefined;
  interval: Interval;
  license: LicenseOrUndefined;
  maxSignals: MaxSignals;
  riskScore: RiskScore;
  riskScoreMapping: RiskScoreMapping;
  ruleNameOverride: RuleNameOverrideOrUndefined;
  outputIndex: OutputIndex;
  name: Name;
  severity: Severity;
  severityMapping: SeverityMapping;
  tags: Tags;
  threat: Threats;
  threshold: ThresholdOrUndefined;
  threatFilters: ThreatFiltersOrUndefined;
  threatIndex: ThreatIndexOrUndefined;
  threatIndicatorPath: ThreatIndicatorPathOrUndefined;
  threatQuery: ThreatQueryOrUndefined;
  threatMapping: ThreatMappingOrUndefined;
  concurrentSearches: ConcurrentSearchesOrUndefined;
  itemsPerSearch: ItemsPerSearchOrUndefined;
  threatLanguage: ThreatLanguageOrUndefined;
  throttle: ThrottleOrNull;
  timestampOverride: TimestampOverrideOrUndefined;
  to: To;
  type: Type;
  references: References;
  note: NoteOrUndefined;
  version: Version;
  exceptionsList: ListArray;
  actions: RuleAlertAction[];
  isRuleRegistryEnabled: boolean;
  namespace?: NamespaceOrUndefined;
  id?: string;
}

export interface UpdateRulesOptions {
  rulesClient: RulesClient;
  defaultOutputIndex: string;
  existingRule: RuleAlertType | null | undefined;
  ruleUpdate: UpdateRulesSchema;
}

export interface PatchRulesOptions extends Partial<PatchRulesFieldsOptions> {
  rulesClient: RulesClient;
  rule: RuleAlertType | null | undefined;
}

interface PatchRulesFieldsOptions {
  anomalyThreshold: AnomalyThresholdOrUndefined;
  author: AuthorOrUndefined;
  buildingBlockType: BuildingBlockTypeOrUndefined;
  description: DescriptionOrUndefined;
  enabled: EnabledOrUndefined;
  eventCategoryOverride: EventCategoryOverrideOrUndefined;
  falsePositives: FalsePositivesOrUndefined;
  from: FromOrUndefined;
  query: QueryOrUndefined;
  language: LanguageOrUndefined;
  savedId: SavedIdOrUndefined;
  timelineId: TimelineIdOrUndefined;
  timelineTitle: TimelineTitleOrUndefined;
  meta: MetaOrUndefined;
  machineLearningJobId: MachineLearningJobIdOrUndefined;
  filters: PartialFilter[];
  index: IndexOrUndefined;
  interval: IntervalOrUndefined;
  license: LicenseOrUndefined;
  maxSignals: MaxSignalsOrUndefined;
  riskScore: RiskScoreOrUndefined;
  riskScoreMapping: RiskScoreMappingOrUndefined;
  ruleNameOverride: RuleNameOverrideOrUndefined;
  outputIndex: OutputIndexOrUndefined;
  name: NameOrUndefined;
  severity: SeverityOrUndefined;
  severityMapping: SeverityMappingOrUndefined;
  tags: TagsOrUndefined;
  threat: ThreatsOrUndefined;
  itemsPerSearch: ItemsPerSearchOrUndefined;
  concurrentSearches: ConcurrentSearchesOrUndefined;
  threshold: ThresholdOrUndefined;
  threatFilters: ThreatFiltersOrUndefined;
  threatIndex: ThreatIndexOrUndefined;
  threatIndicatorPath: ThreatIndicatorPathOrUndefined;
  threatQuery: ThreatQueryOrUndefined;
  threatMapping: ThreatMappingOrUndefined;
  threatLanguage: ThreatLanguageOrUndefined;
  throttle: ThrottleOrUndefinedOrNull;
  timestampOverride: TimestampOverrideOrUndefined;
  to: ToOrUndefined;
  type: TypeOrUndefined;
  references: ReferencesOrUndefined;
  note: NoteOrUndefined;
  version: VersionOrUndefined;
  exceptionsList: ListArrayOrUndefined;
  actions: RuleAlertAction[] | undefined;
  namespace?: NamespaceOrUndefined;
}

export interface ReadRuleOptions {
  isRuleRegistryEnabled: boolean;
  rulesClient: RulesClient;
  id: IdOrUndefined;
  ruleId: RuleIdOrUndefined;
}

export interface DeleteRuleOptions {
  ruleId: Id;
  rulesClient: RulesClient;
  ruleExecutionLog: IRuleExecutionLogForRoutes;
}

export interface FindRuleOptions {
  isRuleRegistryEnabled: boolean;
  rulesClient: RulesClient;
  perPage: PerPageOrUndefined;
  page: PageOrUndefined;
  sortField: SortFieldOrUndefined;
  filter: QueryFilterOrUndefined;
  fields: FieldsOrUndefined;
  sortOrder: SortOrderOrUndefined;
}

export interface BulkEditRulesOptions {
  isRuleRegistryEnabled: boolean;
  rulesClient: RulesClient;
  operations: BulkEditOperation[];
  filter: QueryFilterOrUndefined;
  ids: string[];
  paramsModifier: (params: RuleTypeParams) => Promise<RuleTypeParams>;
}


export interface LegacyMigrateParams {
  rulesClient: RulesClient;
  savedObjectsClient: SavedObjectsClientContract;
  rule: SanitizedRule<RuleParams> | null | undefined;
}
