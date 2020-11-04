/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as t from 'io-ts';

import { listArray } from '../types/lists';
import {
  threat_filters,
  threat_query,
  threat_mapping,
  threat_index,
} from '../types/threat_mapping';
import {
  id,
  index,
  filters,
  event_category_override,
  risk_score_mapping,
  severity_mapping,
  type,
  building_block_type,
  note,
  license,
  timeline_id,
  timeline_title,
  meta,
  rule_name_override,
  timestamp_override,
  author,
  description,
  false_positives,
  from,
  rule_id,
  immutable,
  indexOrUndefined,
  output_index,
  query,
  filtersOrUndefined,
  machine_learning_job_id,
  max_signals,
  risk_score,
  severity,
  threat,
  to,
  references,
  version,
  savedIdOrUndefined,
  saved_id,
  threshold,
  anomaly_threshold,
  name,
  tags,
  actions,
  interval,
  enabled,
  updated_by,
  updated_at,
  created_by,
  created_at,
  job_status,
  status_date,
  last_success_at,
  last_success_message,
  last_failure_at,
  last_failure_message,
  throttleOrNull,
} from '../common/schemas';

const createUpdateSchema = <
  Required extends t.Props,
  Optional extends t.Props,
  Defaultable extends t.Props
>(
  requiredFields: Required,
  optionalFields: Optional,
  defaultableFields: Defaultable
) => {
  return t.intersection([
    t.exact(t.type(requiredFields)),
    t.exact(t.partial(optionalFields)),
    t.exact(t.partial(defaultableFields)),
  ]);
};

const patchSchema = <
  Required extends t.Props,
  Optional extends t.Props,
  Defaultable extends t.Props
>(
  requiredFields: Required,
  optionalFields: Optional,
  defaultableFields: Defaultable
) => {
  return t.intersection([
    t.exact(t.partial(requiredFields)),
    t.exact(t.partial(optionalFields)),
    t.exact(t.partial(defaultableFields)),
  ]);
};

const responseSchema = <
  Required extends t.Props,
  Optional extends t.Props,
  Defaultable extends t.Props
>(
  requiredFields: Required,
  optionalFields: Optional,
  defaultableFields: Defaultable
) => {
  return t.intersection([
    t.exact(t.type(requiredFields)),
    t.exact(t.partial(optionalFields)),
    t.exact(t.type(defaultableFields)),
  ]);
};

const requiredRuleFields = {
  description,
  risk_score,
  name,
  severity,
  type,
};

const optionalRuleFields = {
  building_block_type,
  description,
  note,
  license,
  output_index,
  timeline_id,
  timeline_title,
  meta,
  rule_name_override,
  severity,
  timestamp_override,
};

const defaultableRuleFields = {
  author,
  false_positives,
  from,
  rule_id,
  // maxSignals not used in ML rules but probably should be used
  max_signals,
  risk_score_mapping,
  severity_mapping,
  threat,
  to,
  references,
  version,
  exceptions_list: listArray,
};

const createUpdateRuleParams = createUpdateSchema(
  requiredRuleFields,
  optionalRuleFields,
  defaultableRuleFields
);
const patchRuleParams = patchSchema(requiredRuleFields, optionalRuleFields, defaultableRuleFields);
const responseRuleParams = responseSchema(
  requiredRuleFields,
  optionalRuleFields,
  defaultableRuleFields
);

const eqlRequiredFields = {
  type: t.literal('eql'),
  language: t.literal('eql'),
  query,
};

const eqlOptionalFields = {
  index,
  filters,
  event_category_override,
};

const createUpdateEqlParams = createUpdateSchema(eqlRequiredFields, eqlOptionalFields, {});
const patchEqlParams = patchSchema(eqlRequiredFields, eqlOptionalFields, {});
const responseEqlParams = responseSchema(eqlRequiredFields, eqlOptionalFields, {});

const threatMatchRequiredFields = {
  type: t.literal('threat_match'),
  query,
  threat_query,
  threat_mapping,
  threat_index,
};

const threatMatchOptionalFields = {
  index,
  filters,
  saved_id,
  threat_filters,
  threat_language: t.keyof({ kuery: null, lucene: null }),
};

const threatMatchDefaultableFields = {
  language: t.keyof({ kuery: null, lucene: null }),
};

const createUpdateThreatMatchParams = createUpdateSchema(
  threatMatchRequiredFields,
  threatMatchOptionalFields,
  threatMatchDefaultableFields
);
const patchThreatMatchParams = patchSchema(
  threatMatchRequiredFields,
  threatMatchOptionalFields,
  threatMatchDefaultableFields
);
const responseThreatMatchParams = responseSchema(
  threatMatchRequiredFields,
  threatMatchOptionalFields,
  threatMatchDefaultableFields
);

const queryRequiredFields = {
  type: t.literal('query'),
  query,
};

const queryOptionalFields = {
  index,
  filters,
  saved_id,
};

const queryDefaultableFields = {
  language: t.keyof({ kuery: null, lucene: null }),
};

const createUpdateQueryParams = createUpdateSchema(
  queryRequiredFields,
  queryOptionalFields,
  queryDefaultableFields
);
const patchQueryParams = patchSchema(
  queryRequiredFields,
  queryOptionalFields,
  queryDefaultableFields
);
const responseQueryParams = responseSchema(
  queryRequiredFields,
  queryOptionalFields,
  queryDefaultableFields
);

const savedQueryRequiredFields = {
  type: t.literal('saved_query'),
  saved_id,
};

const savedQueryOptionalFields = {
  // Having language, query, and filters possibly defined adds more code confusion and probably user confusion
  // if the saved object gets deleted for some reason
  index,
  query,
  filters,
};

const savedQueryDefaultableFields = {
  language: t.keyof({ kuery: null, lucene: null }),
};

const createUpdateSavedQueryParams = createUpdateSchema(
  savedQueryRequiredFields,
  savedQueryOptionalFields,
  savedQueryDefaultableFields
);
const patchSavedQueryParams = patchSchema(
  savedQueryRequiredFields,
  savedQueryOptionalFields,
  savedQueryDefaultableFields
);
const responseSavedQueryParams = responseSchema(
  savedQueryRequiredFields,
  savedQueryOptionalFields,
  savedQueryDefaultableFields
);

const thresholdRequiredFields = {
  type: t.literal('threshold'),
  query,
  threshold,
};

const thresholdOptionalFields = {
  index: indexOrUndefined,
  filters: filtersOrUndefined,
  saved_id: savedIdOrUndefined,
};

const thresholdDefaultableFields = {
  language: t.keyof({ kuery: null, lucene: null }),
};

const createUpdateThresholdParams = createUpdateSchema(
  thresholdRequiredFields,
  thresholdOptionalFields,
  thresholdDefaultableFields
);
const patchThresholdParams = patchSchema(
  thresholdRequiredFields,
  thresholdOptionalFields,
  thresholdDefaultableFields
);
const responseThresholdParams = responseSchema(
  thresholdRequiredFields,
  thresholdOptionalFields,
  thresholdDefaultableFields
);

const machineLearningRequiredFields = {
  type: t.literal('machine_learning'),
  anomaly_threshold,
  machine_learning_job_id,
};

const machineLearningOptionalFields = {};

const createUpdateMachineLearningParams = createUpdateSchema(
  machineLearningRequiredFields,
  machineLearningOptionalFields,
  {}
);
const patchMachineLearningParams = patchSchema(
  machineLearningRequiredFields,
  machineLearningOptionalFields,
  {}
);
const responseMachineLearningParams = responseSchema(
  machineLearningRequiredFields,
  machineLearningOptionalFields,
  {}
);

const createUpdateTypeSpecific = t.union([
  createUpdateEqlParams,
  createUpdateThreatMatchParams,
  createUpdateQueryParams,
  createUpdateSavedQueryParams,
  createUpdateThresholdParams,
  createUpdateMachineLearningParams,
]);
export type CreateUpdateTypeSpecific = t.TypeOf<typeof createUpdateTypeSpecific>;

const patchTypeSpecific = t.union([
  patchEqlParams,
  patchThreatMatchParams,
  patchQueryParams,
  patchSavedQueryParams,
  patchThresholdParams,
  patchMachineLearningParams,
]);

const responseTypeSpecific = t.union([
  responseEqlParams,
  responseThreatMatchParams,
  responseQueryParams,
  responseSavedQueryParams,
  responseThresholdParams,
  responseMachineLearningParams,
]);

const coreRequiredRuleFields = {
  name,
};

const coreOptionalRuleFields = {};

const coreDefaultableRuleFields = {
  tags,
  interval,
  enabled,
  throttle: throttleOrNull,
  actions,
};

const createUpdateCoreParams = createUpdateSchema(
  coreRequiredRuleFields,
  coreOptionalRuleFields,
  coreDefaultableRuleFields
);
const patchCoreParams = patchSchema(
  coreRequiredRuleFields,
  coreOptionalRuleFields,
  coreDefaultableRuleFields
);
const responseCoreParams = responseSchema(
  coreRequiredRuleFields,
  coreOptionalRuleFields,
  coreDefaultableRuleFields
);

export const fullCreateSchema = t.intersection([
  createUpdateCoreParams,
  createUpdateRuleParams,
  createUpdateTypeSpecific,
]);
export type FullCreateSchema = t.TypeOf<typeof fullCreateSchema>;

export const fullUpdateSchema = t.intersection([
  createUpdateCoreParams,
  createUpdateRuleParams,
  createUpdateTypeSpecific,
  t.exact(t.partial({ id })),
]);

export const fullPatchSchema = t.intersection([
  patchCoreParams,
  patchRuleParams,
  patchTypeSpecific,
  t.exact(t.partial({ id })),
]);

const responseRequiredFields = {
  id,
  immutable,
  updated_at,
  updated_by,
  created_at,
  created_by,
};
const responseOptionalFields = {
  status: job_status,
  status_date,
  last_success_at,
  last_success_message,
  last_failure_at,
  last_failure_message,
};

export const fullResponseSchema = t.intersection([
  responseCoreParams,
  responseRuleParams,
  responseTypeSpecific,
  t.exact(t.type(responseRequiredFields)),
  t.exact(t.partial(responseOptionalFields)),
]);
export type FullResponseSchema = t.TypeOf<typeof fullResponseSchema>;
