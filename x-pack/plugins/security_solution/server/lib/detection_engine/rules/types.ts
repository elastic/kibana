/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get } from 'lodash/fp';
import { Readable } from 'stream';

import {
  SavedObject,
  SavedObjectAttributes,
  SavedObjectsFindResponse,
  SavedObjectsClientContract,
} from 'kibana/server';
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
} from '@kbn/securitysolution-io-ts-alerting-types';
import type { VersionOrUndefined, Version } from '@kbn/securitysolution-io-ts-types';

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
  JobStatus,
  LastSuccessAt,
  StatusDate,
  LastSuccessMessage,
  LastFailureAt,
  LastFailureMessage,
  Author,
  AuthorOrUndefined,
  LicenseOrUndefined,
  TimestampOverrideOrUndefined,
  BuildingBlockTypeOrUndefined,
  RuleNameOverrideOrUndefined,
  EventCategoryOverrideOrUndefined,
} from '../../../../common/detection_engine/schemas/common/schemas';

import { AlertsClient, PartialAlert } from '../../../../../alerting/server';
import { Alert, SanitizedAlert } from '../../../../../alerting/common';
import { SIGNALS_ID } from '../../../../common/constants';
import { PartialFilter } from '../types';
import { RuleParams } from '../schemas/rule_schemas';
import { RuleStatusSavedObjectsClient } from '../signals/rule_status_saved_objects_client';

export type RuleAlertType = Alert<RuleParams>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface IRuleStatusSOAttributes extends Record<string, any> {
  alertId: string; // created alert id.
  statusDate: StatusDate;
  lastFailureAt: LastFailureAt | null | undefined;
  lastFailureMessage: LastFailureMessage | null | undefined;
  lastSuccessAt: LastSuccessAt | null | undefined;
  lastSuccessMessage: LastSuccessMessage | null | undefined;
  status: JobStatus | null | undefined;
  lastLookBackDate: string | null | undefined;
  gap: string | null | undefined;
  bulkCreateTimeDurations: string[] | null | undefined;
  searchAfterTimeDurations: string[] | null | undefined;
}

export interface IRuleStatusResponseAttributes {
  alert_id: string; // created alert id.
  status_date: StatusDate;
  last_failure_at: LastFailureAt | null | undefined;
  last_failure_message: LastFailureMessage | null | undefined;
  last_success_at: LastSuccessAt | null | undefined;
  last_success_message: LastSuccessMessage | null | undefined;
  status: JobStatus | null | undefined;
  last_look_back_date: string | null | undefined; // NOTE: This is no longer used on the UI, but left here in case users are using it within the API
  gap: string | null | undefined;
  bulk_create_time_durations: string[] | null | undefined;
  search_after_time_durations: string[] | null | undefined;
}

export interface RuleStatusResponse {
  [key: string]: {
    current_status: IRuleStatusResponseAttributes | null | undefined;
    failures: IRuleStatusResponseAttributes[] | null | undefined;
  };
}

export interface IRuleSavedAttributesSavedObjectAttributes
  extends IRuleStatusSOAttributes,
    SavedObjectAttributes {}

export interface IRuleStatusSavedObject {
  type: string;
  id: string;
  attributes: Array<SavedObject<IRuleStatusSOAttributes & SavedObjectAttributes>>;
  references: unknown[];
  updated_at: string;
  version: string;
}

export interface IRuleStatusFindType {
  page: number;
  per_page: number;
  total: number;
  saved_objects: IRuleStatusSavedObject[];
}

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
  alertsClient: AlertsClient;
}

export const isAlertTypes = (
  partialAlert: Array<PartialAlert<RuleParams>>
): partialAlert is RuleAlertType[] => {
  return partialAlert.every((rule) => isAlertType(rule));
};

export const isAlertType = (
  partialAlert: PartialAlert<RuleParams>
): partialAlert is RuleAlertType => {
  return partialAlert.alertTypeId === SIGNALS_ID;
};

export const isRuleStatusSavedObjectType = (
  obj: unknown
): obj is SavedObject<IRuleSavedAttributesSavedObjectAttributes> => {
  return get('attributes', obj) != null;
};

export const isRuleStatusFindType = (
  obj: unknown
): obj is SavedObjectsFindResponse<IRuleSavedAttributesSavedObjectAttributes> => {
  return get('saved_objects', obj) != null;
};

export interface CreateRulesOptions {
  alertsClient: AlertsClient;
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
  timestampOverride: TimestampOverrideOrUndefined;
  to: To;
  type: Type;
  references: References;
  note: NoteOrUndefined;
  version: Version;
  exceptionsList: ListArray;
  actions: RuleAlertAction[];
}

export interface UpdateRulesOptions {
  savedObjectsClient: SavedObjectsClientContract;
  alertsClient: AlertsClient;
  defaultOutputIndex: string;
  ruleUpdate: UpdateRulesSchema;
}

export interface PatchRulesOptions {
  savedObjectsClient: SavedObjectsClientContract;
  alertsClient: AlertsClient;
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
  threatQuery: ThreatQueryOrUndefined;
  threatMapping: ThreatMappingOrUndefined;
  threatLanguage: ThreatLanguageOrUndefined;
  timestampOverride: TimestampOverrideOrUndefined;
  to: ToOrUndefined;
  type: TypeOrUndefined;
  references: ReferencesOrUndefined;
  note: NoteOrUndefined;
  version: VersionOrUndefined;
  exceptionsList: ListArrayOrUndefined;
  actions: RuleAlertAction[] | undefined;
  rule: SanitizedAlert<RuleParams> | null;
}

export interface ReadRuleOptions {
  alertsClient: AlertsClient;
  id: IdOrUndefined;
  ruleId: RuleIdOrUndefined;
}

export interface DeleteRuleOptions {
  alertsClient: AlertsClient;
  savedObjectsClient: SavedObjectsClientContract;
  ruleStatusClient: RuleStatusSavedObjectsClient;
  ruleStatuses: SavedObjectsFindResponse<IRuleStatusSOAttributes, unknown>;
  id: Id;
}

export interface FindRuleOptions {
  alertsClient: AlertsClient;
  perPage: PerPageOrUndefined;
  page: PageOrUndefined;
  sortField: SortFieldOrUndefined;
  filter: QueryFilterOrUndefined;
  fields: FieldsOrUndefined;
  sortOrder: SortOrderOrUndefined;
}
