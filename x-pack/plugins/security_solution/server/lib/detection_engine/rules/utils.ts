/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { pickBy, isEmpty } from 'lodash/fp';
import type {
  FromOrUndefined,
  MachineLearningJobIdOrUndefined,
  RiskScoreMappingOrUndefined,
  RiskScoreOrUndefined,
  ConcurrentSearchesOrUndefined,
  ItemsPerSearchOrUndefined,
  ThreatFiltersOrUndefined,
  ThreatIndexOrUndefined,
  ThreatLanguageOrUndefined,
  ThreatMappingOrUndefined,
  ThreatQueryOrUndefined,
  ThreatsOrUndefined,
  TypeOrUndefined,
  LanguageOrUndefined,
  SeverityOrUndefined,
  SeverityMappingOrUndefined,
  MaxSignalsOrUndefined,
} from '@kbn/securitysolution-io-ts-alerting-types';
import type { ListArrayOrUndefined } from '@kbn/securitysolution-io-ts-list-types';
import type { VersionOrUndefined } from '@kbn/securitysolution-io-ts-types';
import {
  DescriptionOrUndefined,
  AnomalyThresholdOrUndefined,
  QueryOrUndefined,
  SavedIdOrUndefined,
  TimelineIdOrUndefined,
  TimelineTitleOrUndefined,
  IndexOrUndefined,
  NoteOrUndefined,
  MetaOrUndefined,
  FalsePositivesOrUndefined,
  OutputIndexOrUndefined,
  IntervalOrUndefined,
  NameOrUndefined,
  TagsOrUndefined,
  ToOrUndefined,
  ThresholdOrUndefined,
  ReferencesOrUndefined,
  AuthorOrUndefined,
  BuildingBlockTypeOrUndefined,
  LicenseOrUndefined,
  RuleNameOverrideOrUndefined,
  TimestampOverrideOrUndefined,
  EventCategoryOverrideOrUndefined,
} from '../../../../common/detection_engine/schemas/common/schemas';
import { PartialFilter } from '../types';

export const calculateInterval = (
  interval: string | undefined,
  ruleInterval: string | undefined
): string => {
  if (interval != null) {
    return interval;
  } else if (ruleInterval != null) {
    return ruleInterval;
  } else {
    return '5m';
  }
};

export interface UpdateProperties {
  author: AuthorOrUndefined;
  buildingBlockType: BuildingBlockTypeOrUndefined;
  description: DescriptionOrUndefined;
  eventCategoryOverride: EventCategoryOverrideOrUndefined;
  falsePositives: FalsePositivesOrUndefined;
  from: FromOrUndefined;
  query: QueryOrUndefined;
  language: LanguageOrUndefined;
  license: LicenseOrUndefined;
  savedId: SavedIdOrUndefined;
  timelineId: TimelineIdOrUndefined;
  timelineTitle: TimelineTitleOrUndefined;
  meta: MetaOrUndefined;
  machineLearningJobId: MachineLearningJobIdOrUndefined;
  filters: PartialFilter[];
  index: IndexOrUndefined;
  interval: IntervalOrUndefined;
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
  threshold: ThresholdOrUndefined;
  threatFilters: ThreatFiltersOrUndefined;
  threatIndex: ThreatIndexOrUndefined;
  threatQuery: ThreatQueryOrUndefined;
  threatMapping: ThreatMappingOrUndefined;
  threatLanguage: ThreatLanguageOrUndefined;
  concurrentSearches: ConcurrentSearchesOrUndefined;
  itemsPerSearch: ItemsPerSearchOrUndefined;
  timestampOverride: TimestampOverrideOrUndefined;
  to: ToOrUndefined;
  type: TypeOrUndefined;
  references: ReferencesOrUndefined;
  note: NoteOrUndefined;
  version: VersionOrUndefined;
  exceptionsList: ListArrayOrUndefined;
  anomalyThreshold: AnomalyThresholdOrUndefined;
}

export const calculateVersion = (
  immutable: boolean,
  currentVersion: number,
  updateProperties: UpdateProperties
): number => {
  // early return if we are pre-packaged/immutable rule to be safe. We are never responsible
  // for changing the version number of an immutable. Immutables are only responsible for changing
  // their own version number. This would be really bad if an immutable version number is bumped by us
  // due to a bug, hence the extra check and early bail if that is detected.
  if (immutable === true) {
    if (updateProperties.version != null) {
      // we are an immutable rule but we are asking to update the version number so go ahead
      // and update it to what is asked.
      return updateProperties.version;
    } else {
      // we are immutable and not asking to update the version number so return the existing version
      return currentVersion;
    }
  }

  // white list all properties but the enabled/disabled flag. We don't want to auto-increment
  // the version number if only the enabled/disabled flag is being set. Likewise if we get other
  // properties we are not expecting such as updatedAt we do not to cause a version number bump
  // on that either.
  const removedNullValues = removeUndefined(updateProperties);
  if (isEmpty(removedNullValues)) {
    return currentVersion;
  } else {
    return currentVersion + 1;
  }
};

export const removeUndefined = (obj: object) => {
  return pickBy((value: unknown) => value != null, obj);
};

export const calculateName = ({
  updatedName,
  originalName,
}: {
  updatedName: string | undefined;
  originalName: string | undefined;
}): string => {
  if (updatedName != null) {
    return updatedName;
  } else if (originalName != null) {
    return originalName;
  } else {
    // You really should never get to this point. This is a fail safe way to send back
    // the name of "untitled" just in case a rule name became null or undefined at
    // some point since TypeScript allows it.
    return 'untitled';
  }
};
