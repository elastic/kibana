/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Readable } from 'stream';

import { SavedObjectAttributes, SavedObjectsClientContract } from '@kbn/core/server';
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
import { ruleTypeMappings } from '@kbn/securitysolution-rules';

import type { ListArrayOrUndefined, ListArray } from '@kbn/securitysolution-io-ts-list-types';
import { RulesClient, PartialRule, BulkEditOperation } from '@kbn/alerting-plugin/server';
import { SanitizedRule } from '@kbn/alerting-plugin/common';
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
  TimestampFieldOrUndefined,
  EventCategoryOverrideOrUndefined,
  TiebreakerFieldOrUndefined,
  NamespaceOrUndefined,
  DataViewIdOrUndefined,
  RelatedIntegrationArray,
  RequiredFieldArray,
  SetupGuide,
  DisableTimestampFallbackOrUndefined,
} from '../../../../common/detection_engine/schemas/common';

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
  partialAlert: Array<PartialRule<RuleParams>>
): partialAlert is RuleAlertType[] => {
  return partialAlert.every((rule) => isAlertType(rule));
};

export const isAlertType = (
  partialAlert: PartialRule<RuleParams>
): partialAlert is RuleAlertType => {
  const ruleTypeValues = Object.values(ruleTypeMappings) as unknown as string[];
  return ruleTypeValues.includes(partialAlert.alertTypeId as string);
};

export interface CreateRulesOptions {
  rulesClient: RulesClient;
  anomalyThreshold: AnomalyThresholdOrUndefined;
  author: Author;
  buildingBlockType: BuildingBlockTypeOrUndefined;
  description: Description;
  enabled: Enabled;
  timestampField: TimestampFieldOrUndefined;
  eventCategoryOverride: EventCategoryOverrideOrUndefined;
  tiebreakerField: TiebreakerFieldOrUndefined;
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
  dataViewId: DataViewIdOrUndefined;
  interval: Interval;
  license: LicenseOrUndefined;
  maxSignals: MaxSignals;
  relatedIntegrations: RelatedIntegrationArray | undefined;
  requiredFields: RequiredFieldArray | undefined;
  riskScore: RiskScore;
  riskScoreMapping: RiskScoreMapping;
  ruleNameOverride: RuleNameOverrideOrUndefined;
  outputIndex: OutputIndex;
  name: Name;
  setup: SetupGuide | undefined;
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
  disableTimestampFallback: DisableTimestampFallbackOrUndefined;
  to: To;
  type: Type;
  references: References;
  note: NoteOrUndefined;
  version: Version;
  exceptionsList: ListArray;
  actions: RuleAlertAction[];
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
  timestampField: TimestampFieldOrUndefined;
  eventCategoryOverride: EventCategoryOverrideOrUndefined;
  tiebreakerField: TiebreakerFieldOrUndefined;
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
  dataViewId: DataViewIdOrUndefined;
  interval: IntervalOrUndefined;
  license: LicenseOrUndefined;
  maxSignals: MaxSignalsOrUndefined;
  relatedIntegrations: RelatedIntegrationArray | undefined;
  requiredFields: RequiredFieldArray | undefined;
  riskScore: RiskScoreOrUndefined;
  riskScoreMapping: RiskScoreMappingOrUndefined;
  ruleNameOverride: RuleNameOverrideOrUndefined;
  outputIndex: OutputIndexOrUndefined;
  name: NameOrUndefined;
  setup: SetupGuide | undefined;
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
  disableTimestampFallback: DisableTimestampFallbackOrUndefined;
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
  filter?: QueryFilterOrUndefined;
  ids?: string[];
  paramsModifier?: (params: RuleParams) => Promise<RuleParams>;
}

export interface LegacyMigrateParams {
  rulesClient: RulesClient;
  savedObjectsClient: SavedObjectsClientContract;
  rule: SanitizedRule<RuleParams> | null | undefined;
}
