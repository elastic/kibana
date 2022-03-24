/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  From,
  MachineLearningJobIdOrUndefined,
  RiskScore,
  RiskScoreMappingOrUndefined,
  ThreatIndexOrUndefined,
  ThreatQueryOrUndefined,
  ThreatMappingOrUndefined,
  ThreatLanguageOrUndefined,
  ConcurrentSearchesOrUndefined,
  ItemsPerSearchOrUndefined,
  ThreatIndicatorPathOrUndefined,
  ThreatsOrUndefined,
  Type,
  LanguageOrUndefined,
  Severity,
  SeverityMappingOrUndefined,
  MaxSignals,
} from '@kbn/securitysolution-io-ts-alerting-types';
import { Version } from '@kbn/securitysolution-io-ts-types';

import type { ListArrayOrUndefined } from '@kbn/securitysolution-io-ts-list-types';
import type { Filter } from '@kbn/es-query';
import {
  AnomalyThresholdOrUndefined,
  Description,
  NoteOrUndefined,
  ThresholdOrUndefined,
  FalsePositives,
  Immutable,
  IndexOrUndefined,
  OutputIndex,
  QueryOrUndefined,
  References,
  SavedIdOrUndefined,
  To,
  TimelineIdOrUndefined,
  TimelineTitleOrUndefined,
  MetaOrUndefined,
  RuleId,
  AuthorOrUndefined,
  BuildingBlockTypeOrUndefined,
  LicenseOrUndefined,
  RuleNameOverrideOrUndefined,
  TimestampOverrideOrUndefined,
  EventCategoryOverrideOrUndefined,
} from '../../../common/detection_engine/schemas/common/schemas';

import { AlertTypeParams } from '../../../../alerting/common';

export type PartialFilter = Partial<Filter>;

export interface RuleTypeParams extends AlertTypeParams {
  anomalyThreshold?: AnomalyThresholdOrUndefined;
  author: AuthorOrUndefined;
  buildingBlockType: BuildingBlockTypeOrUndefined;
  description: Description;
  note: NoteOrUndefined;
  eventCategoryOverride?: EventCategoryOverrideOrUndefined;
  falsePositives: FalsePositives;
  from: From;
  ruleId: RuleId;
  immutable: Immutable;
  index?: IndexOrUndefined;
  language?: LanguageOrUndefined;
  license: LicenseOrUndefined;
  outputIndex: OutputIndex;
  savedId?: SavedIdOrUndefined;
  timelineId: TimelineIdOrUndefined;
  timelineTitle: TimelineTitleOrUndefined;
  meta: MetaOrUndefined;
  machineLearningJobId?: MachineLearningJobIdOrUndefined;
  query?: QueryOrUndefined;
  filters?: unknown[];
  maxSignals: MaxSignals;
  namespace?: string;
  riskScore: RiskScore;
  riskScoreMapping: RiskScoreMappingOrUndefined;
  ruleNameOverride: RuleNameOverrideOrUndefined;
  severity: Severity;
  severityMapping: SeverityMappingOrUndefined;
  threat: ThreatsOrUndefined;
  threshold?: ThresholdOrUndefined;
  threatFilters?: unknown[] | undefined;
  threatIndex?: ThreatIndexOrUndefined;
  threatIndicatorPath?: ThreatIndicatorPathOrUndefined;
  threatQuery?: ThreatQueryOrUndefined;
  threatMapping?: ThreatMappingOrUndefined;
  threatLanguage?: ThreatLanguageOrUndefined;
  timestampOverride: TimestampOverrideOrUndefined;
  to: To;
  type: Type;
  references: References;
  version: Version;
  exceptionsList: ListArrayOrUndefined;
  concurrentSearches?: ConcurrentSearchesOrUndefined;
  itemsPerSearch?: ItemsPerSearchOrUndefined;
}

export type RefreshTypes = false | 'wait_for';
