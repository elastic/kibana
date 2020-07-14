/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get } from 'lodash/fp';
import { Readable } from 'stream';

import {
  SavedObject,
  SavedObjectAttributes,
  SavedObjectsFindResponse,
  SavedObjectsClientContract,
} from 'kibana/server';
import { RuleAlertAction } from '../../../../common/detection_engine/types';
import {
  FalsePositives,
  From,
  RuleId,
  Immutable,
  DescriptionOrUndefined,
  Interval,
  MaxSignals,
  RiskScore,
  OutputIndex,
  Name,
  Severity,
  Tags,
  Threat,
  To,
  Type,
  References,
  Version,
  AnomalyThresholdOrUndefined,
  QueryOrUndefined,
  LanguageOrUndefined,
  SavedIdOrUndefined,
  TimelineIdOrUndefined,
  TimelineTitleOrUndefined,
  MachineLearningJobIdOrUndefined,
  IndexOrUndefined,
  NoteOrUndefined,
  MetaOrUndefined,
  Description,
  Enabled,
  VersionOrUndefined,
  IdOrUndefined,
  RuleIdOrUndefined,
  EnabledOrUndefined,
  FalsePositivesOrUndefined,
  FromOrUndefined,
  OutputIndexOrUndefined,
  IntervalOrUndefined,
  MaxSignalsOrUndefined,
  RiskScoreOrUndefined,
  NameOrUndefined,
  SeverityOrUndefined,
  TagsOrUndefined,
  ToOrUndefined,
  ThreatOrUndefined,
  TypeOrUndefined,
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
  RiskScoreMapping,
  RiskScoreMappingOrUndefined,
  SeverityMapping,
  SeverityMappingOrUndefined,
  TimestampOverrideOrUndefined,
  BuildingBlockTypeOrUndefined,
  RuleNameOverrideOrUndefined,
} from '../../../../common/detection_engine/schemas/common/schemas';
import { AlertsClient, PartialAlert } from '../../../../../alerts/server';
import { Alert, SanitizedAlert } from '../../../../../alerts/common';
import { SIGNALS_ID } from '../../../../common/constants';
import { RuleTypeParams, PartialFilter } from '../types';
import { ListArrayOrUndefined, ListArray } from '../../../../common/detection_engine/schemas/types';

export interface RuleAlertType extends Alert {
  params: RuleTypeParams;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface IRuleStatusAttributes extends Record<string, any> {
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

export interface RuleStatusResponse {
  [key: string]: {
    current_status: IRuleStatusAttributes | null | undefined;
    failures: IRuleStatusAttributes[] | null | undefined;
  };
}

export interface IRuleSavedAttributesSavedObjectAttributes
  extends IRuleStatusAttributes,
    SavedObjectAttributes {}

export interface IRuleStatusSavedObject {
  type: string;
  id: string;
  attributes: Array<SavedObject<IRuleStatusAttributes & SavedObjectAttributes>>;
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

export interface HapiReadableStream extends Readable {
  hapi: {
    filename: string;
  };
}

export interface Clients {
  alertsClient: AlertsClient;
}

export const isAlertTypes = (partialAlert: PartialAlert[]): partialAlert is RuleAlertType[] => {
  return partialAlert.every((rule) => isAlertType(rule));
};

export const isAlertType = (partialAlert: PartialAlert): partialAlert is RuleAlertType => {
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

export const isRuleStatusFindTypes = (
  obj: unknown[] | undefined
): obj is Array<SavedObjectsFindResponse<IRuleSavedAttributesSavedObjectAttributes>> => {
  return obj ? obj.every((ruleStatus) => isRuleStatusFindType(ruleStatus)) : false;
};

export interface CreateRulesOptions {
  alertsClient: AlertsClient;
  anomalyThreshold: AnomalyThresholdOrUndefined;
  author: Author;
  buildingBlockType: BuildingBlockTypeOrUndefined;
  description: Description;
  enabled: Enabled;
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
  threat: Threat;
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
  id: IdOrUndefined;
  savedObjectsClient: SavedObjectsClientContract;
  alertsClient: AlertsClient;
  anomalyThreshold: AnomalyThresholdOrUndefined;
  author: Author;
  buildingBlockType: BuildingBlockTypeOrUndefined;
  description: Description;
  enabled: Enabled;
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
  ruleId: RuleIdOrUndefined;
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
  threat: Threat;
  timestampOverride: TimestampOverrideOrUndefined;
  to: To;
  type: Type;
  references: References;
  note: NoteOrUndefined;
  version: VersionOrUndefined;
  exceptionsList: ListArray;
  actions: RuleAlertAction[];
}

export interface PatchRulesOptions {
  savedObjectsClient: SavedObjectsClientContract;
  alertsClient: AlertsClient;
  anomalyThreshold: AnomalyThresholdOrUndefined;
  author: AuthorOrUndefined;
  buildingBlockType: BuildingBlockTypeOrUndefined;
  description: DescriptionOrUndefined;
  enabled: EnabledOrUndefined;
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
  threat: ThreatOrUndefined;
  timestampOverride: TimestampOverrideOrUndefined;
  to: ToOrUndefined;
  type: TypeOrUndefined;
  references: ReferencesOrUndefined;
  note: NoteOrUndefined;
  version: VersionOrUndefined;
  exceptionsList: ListArrayOrUndefined;
  actions: RuleAlertAction[] | undefined;
  rule: SanitizedAlert | null;
}

export interface ReadRuleOptions {
  alertsClient: AlertsClient;
  id: IdOrUndefined;
  ruleId: RuleIdOrUndefined;
}

export interface DeleteRuleOptions {
  alertsClient: AlertsClient;
  id: IdOrUndefined;
  ruleId: RuleIdOrUndefined;
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
