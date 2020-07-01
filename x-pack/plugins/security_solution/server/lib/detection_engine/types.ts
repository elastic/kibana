/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  AnomalyThresholdOrUndefined,
  Description,
  NoteOrUndefined,
  ThreatOrUndefined,
  FalsePositives,
  From,
  Immutable,
  IndexOrUndefined,
  LanguageOrUndefined,
  MaxSignals,
  MachineLearningJobIdOrUndefined,
  RiskScore,
  OutputIndex,
  QueryOrUndefined,
  References,
  SavedIdOrUndefined,
  Severity,
  To,
  TimelineIdOrUndefined,
  TimelineTitleOrUndefined,
  Version,
  MetaOrUndefined,
  RuleId,
} from '../../../common/detection_engine/schemas/common/schemas';
import { LegacyCallAPIOptions } from '../../../../../../src/core/server';
import { Filter } from '../../../../../../src/plugins/data/server';
import { RuleType } from '../../../common/detection_engine/types';
import { ListArrayOrUndefined } from '../../../common/detection_engine/schemas/types';

export type PartialFilter = Partial<Filter>;

export interface RuleTypeParams {
  anomalyThreshold: AnomalyThresholdOrUndefined;
  description: Description;
  note: NoteOrUndefined;
  falsePositives: FalsePositives;
  from: From;
  ruleId: RuleId;
  immutable: Immutable;
  index: IndexOrUndefined;
  language: LanguageOrUndefined;
  outputIndex: OutputIndex;
  savedId: SavedIdOrUndefined;
  timelineId: TimelineIdOrUndefined;
  timelineTitle: TimelineTitleOrUndefined;
  meta: MetaOrUndefined;
  machineLearningJobId: MachineLearningJobIdOrUndefined;
  query: QueryOrUndefined;
  filters: PartialFilter[] | undefined;
  maxSignals: MaxSignals;
  riskScore: RiskScore;
  severity: Severity;
  threat: ThreatOrUndefined;
  to: To;
  type: RuleType;
  references: References;
  version: Version;
  exceptionsList: ListArrayOrUndefined;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type CallWithRequest<T extends Record<string, any>, V> = (
  endpoint: string,
  params: T,
  options?: LegacyCallAPIOptions
) => Promise<V>;

export type RefreshTypes = false | 'wait_for';
