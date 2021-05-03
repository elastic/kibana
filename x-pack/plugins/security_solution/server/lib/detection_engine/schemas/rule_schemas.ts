/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';

import { listArray } from '../../../../common/detection_engine/schemas/types/lists';
import {
  threat_mapping,
  threat_index,
  threat_query,
  concurrentSearchesOrUndefined,
  itemsPerSearchOrUndefined,
  threatIndicatorPathOrUndefined,
} from '../../../../common/detection_engine/schemas/types/threat_mapping';
import {
  author,
  buildingBlockTypeOrUndefined,
  description,
  enabled,
  noteOrUndefined,
  false_positives,
  from,
  rule_id,
  immutable,
  indexOrUndefined,
  licenseOrUndefined,
  output_index,
  timelineIdOrUndefined,
  timelineTitleOrUndefined,
  metaOrUndefined,
  name,
  query,
  queryOrUndefined,
  filtersOrUndefined,
  max_signals,
  risk_score,
  risk_score_mapping,
  ruleNameOverrideOrUndefined,
  severity,
  severity_mapping,
  tags,
  timestampOverrideOrUndefined,
  threats,
  to,
  references,
  version,
  eventCategoryOverrideOrUndefined,
  savedIdOrUndefined,
  saved_id,
  thresholdNormalized,
  anomaly_threshold,
  actionsCamel,
  throttleOrNull,
  createdByOrNull,
  updatedByOrNull,
  created_at,
  updated_at,
} from '../../../../common/detection_engine/schemas/common/schemas';
import { SIGNALS_ID, SERVER_APP_ID } from '../../../../common/constants';
import { machine_learning_job_id_normalized } from '../../../../common/detection_engine/schemas/types/normalized_ml_job_id';

const nonEqlLanguages = t.keyof({ kuery: null, lucene: null });
export const baseRuleParams = t.exact(
  t.type({
    author,
    buildingBlockType: buildingBlockTypeOrUndefined,
    description,
    note: noteOrUndefined,
    falsePositives: false_positives,
    from,
    ruleId: rule_id,
    immutable,
    license: licenseOrUndefined,
    outputIndex: output_index,
    timelineId: timelineIdOrUndefined,
    timelineTitle: timelineTitleOrUndefined,
    meta: metaOrUndefined,
    // maxSignals not used in ML rules but probably should be used
    maxSignals: max_signals,
    riskScore: risk_score,
    riskScoreMapping: risk_score_mapping,
    ruleNameOverride: ruleNameOverrideOrUndefined,
    severity,
    severityMapping: severity_mapping,
    timestampOverride: timestampOverrideOrUndefined,
    threat: threats,
    to,
    references,
    version,
    exceptionsList: listArray,
  })
);
export type BaseRuleParams = t.TypeOf<typeof baseRuleParams>;

const eqlSpecificRuleParams = t.type({
  type: t.literal('eql'),
  language: t.literal('eql'),
  index: indexOrUndefined,
  query,
  filters: filtersOrUndefined,
  eventCategoryOverride: eventCategoryOverrideOrUndefined,
});
export const eqlRuleParams = t.intersection([baseRuleParams, eqlSpecificRuleParams]);
export type EqlRuleParams = t.TypeOf<typeof eqlRuleParams>;

const threatSpecificRuleParams = t.type({
  type: t.literal('threat_match'),
  language: nonEqlLanguages,
  index: indexOrUndefined,
  query,
  filters: filtersOrUndefined,
  savedId: savedIdOrUndefined,
  threatFilters: filtersOrUndefined,
  threatQuery: threat_query,
  threatMapping: threat_mapping,
  threatLanguage: t.union([nonEqlLanguages, t.undefined]),
  threatIndex: threat_index,
  threatIndicatorPath: threatIndicatorPathOrUndefined,
  concurrentSearches: concurrentSearchesOrUndefined,
  itemsPerSearch: itemsPerSearchOrUndefined,
});
export const threatRuleParams = t.intersection([baseRuleParams, threatSpecificRuleParams]);
export type ThreatRuleParams = t.TypeOf<typeof threatRuleParams>;

const querySpecificRuleParams = t.exact(
  t.type({
    type: t.literal('query'),
    language: nonEqlLanguages,
    index: indexOrUndefined,
    query,
    filters: filtersOrUndefined,
    savedId: savedIdOrUndefined,
  })
);
export const queryRuleParams = t.intersection([baseRuleParams, querySpecificRuleParams]);
export type QueryRuleParams = t.TypeOf<typeof queryRuleParams>;

const savedQuerySpecificRuleParams = t.type({
  type: t.literal('saved_query'),
  // Having language, query, and filters possibly defined adds more code confusion and probably user confusion
  // if the saved object gets deleted for some reason
  language: nonEqlLanguages,
  index: indexOrUndefined,
  query: queryOrUndefined,
  filters: filtersOrUndefined,
  savedId: saved_id,
});
export const savedQueryRuleParams = t.intersection([baseRuleParams, savedQuerySpecificRuleParams]);
export type SavedQueryRuleParams = t.TypeOf<typeof savedQueryRuleParams>;

const thresholdSpecificRuleParams = t.type({
  type: t.literal('threshold'),
  language: nonEqlLanguages,
  index: indexOrUndefined,
  query,
  filters: filtersOrUndefined,
  savedId: savedIdOrUndefined,
  threshold: thresholdNormalized,
});
export const thresholdRuleParams = t.intersection([baseRuleParams, thresholdSpecificRuleParams]);
export type ThresholdRuleParams = t.TypeOf<typeof thresholdRuleParams>;

const machineLearningSpecificRuleParams = t.type({
  type: t.literal('machine_learning'),
  anomalyThreshold: anomaly_threshold,
  machineLearningJobId: machine_learning_job_id_normalized,
});
export const machineLearningRuleParams = t.intersection([
  baseRuleParams,
  machineLearningSpecificRuleParams,
]);
export type MachineLearningRuleParams = t.TypeOf<typeof machineLearningRuleParams>;

export const typeSpecificRuleParams = t.union([
  eqlSpecificRuleParams,
  threatSpecificRuleParams,
  querySpecificRuleParams,
  savedQuerySpecificRuleParams,
  thresholdSpecificRuleParams,
  machineLearningSpecificRuleParams,
]);
export type TypeSpecificRuleParams = t.TypeOf<typeof typeSpecificRuleParams>;

export const ruleParams = t.intersection([baseRuleParams, typeSpecificRuleParams]);
export type RuleParams = t.TypeOf<typeof ruleParams>;

export const internalRuleCreate = t.type({
  name,
  tags,
  alertTypeId: t.literal(SIGNALS_ID),
  consumer: t.literal(SERVER_APP_ID),
  schedule: t.type({
    interval: t.string,
  }),
  enabled,
  actions: actionsCamel,
  params: ruleParams,
  throttle: throttleOrNull,
  notifyWhen: t.null,
});
export type InternalRuleCreate = t.TypeOf<typeof internalRuleCreate>;

export const internalRuleUpdate = t.type({
  name,
  tags,
  schedule: t.type({
    interval: t.string,
  }),
  actions: actionsCamel,
  params: ruleParams,
  throttle: throttleOrNull,
  notifyWhen: t.null,
});
export type InternalRuleUpdate = t.TypeOf<typeof internalRuleUpdate>;

export const internalRuleResponse = t.intersection([
  internalRuleCreate,
  t.type({
    id: t.string,
    createdBy: createdByOrNull,
    updatedBy: updatedByOrNull,
    createdAt: created_at,
    updatedAt: updated_at,
  }),
]);
export type InternalRuleResponse = t.TypeOf<typeof internalRuleResponse>;
