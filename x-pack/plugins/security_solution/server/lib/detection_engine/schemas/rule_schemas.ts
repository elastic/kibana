/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as t from 'io-ts';

import { listArrayOrUndefined } from '../../../../common/detection_engine/schemas/types/lists';
import {
  threatQueryOrUndefined,
  threatMappingOrUndefined,
  threatLanguageOrUndefined,
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
  language,
  languageOrUndefined,
  licenseOrUndefined,
  output_index,
  timelineIdOrUndefined,
  timelineTitleOrUndefined,
  metaOrUndefined,
  name,
  query,
  queryOrUndefined,
  filtersOrUndefined,
  machine_learning_job_id,
  max_signals,
  risk_score,
  riskScoreMappingOrUndefined,
  ruleNameOverrideOrUndefined,
  severity,
  severityMappingOrUndefined,
  tags,
  timestampOverrideOrUndefined,
  threat,
  to,
  references,
  version,
  eventCategoryOverrideOrUndefined,
  savedIdOrUndefined,
  saved_id,
  threshold,
  anomaly_threshold,
  actionsCamel,
  throttleOrNull,
} from '../../../../common/detection_engine/schemas/common/schemas';
import { SIGNALS_ID, SERVER_APP_ID } from '../../../../common/constants';

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
    riskScoreMapping: riskScoreMappingOrUndefined,
    ruleNameOverride: ruleNameOverrideOrUndefined,
    severity,
    severityMapping: severityMappingOrUndefined,
    timestampOverride: timestampOverrideOrUndefined,
    threat,
    to,
    references,
    version,
    exceptionsList: listArrayOrUndefined,
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

const threatSpecificRuleParams = t.type({
  type: t.literal('threat_match'),
  language,
  index: indexOrUndefined,
  query,
  filters: filtersOrUndefined,
  savedId: savedIdOrUndefined,
  threatFilters: filtersOrUndefined,
  threatQuery: threatQueryOrUndefined,
  threatMapping: threatMappingOrUndefined,
  threatLanguage: threatLanguageOrUndefined,
});

const querySpecificRuleParams = t.exact(
  t.type({
    type: t.literal('query'),
    language,
    index: indexOrUndefined,
    query,
    filters: filtersOrUndefined,
    savedId: savedIdOrUndefined,
  })
);

const savedQuerySpecificRuleParams = t.type({
  type: t.literal('saved_query'),
  // Having language, query, and filters possibly defined adds more code confusion and probably user confusion
  // if the saved object gets deleted for some reason
  language: languageOrUndefined,
  index: indexOrUndefined,
  query: queryOrUndefined,
  filters: filtersOrUndefined,
  savedId: saved_id,
});

const thresholdSpecificRuleParams = t.type({
  type: t.literal('threshold'),
  language,
  index: indexOrUndefined,
  query,
  filters: filtersOrUndefined,
  savedId: savedIdOrUndefined,
  threshold,
});

const machineLearningSpecificRuleParams = t.type({
  type: t.literal('machine_learning'),
  anomalyThreshold: anomaly_threshold,
  machineLearningJobId: machine_learning_job_id,
});

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
});
export type InternalRuleCreate = t.TypeOf<typeof internalRuleCreate>;
