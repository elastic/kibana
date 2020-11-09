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
  concurrent_searches,
  items_per_search,
} from '../types/threat_mapping';
import {
  id,
  index,
  filters,
  event_category_override,
  risk_score_mapping,
  severity_mapping,
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
  output_index,
  query,
  machine_learning_job_id,
  max_signals,
  risk_score,
  severity,
  threat,
  to,
  references,
  version,
  saved_id,
  threshold,
  anomaly_threshold,
  name,
  tags,
  actions,
  interval,
  enabled,
  updated_at,
  created_at,
  job_status,
  status_date,
  last_success_at,
  last_success_message,
  last_failure_at,
  last_failure_message,
  throttleOrNull,
  createdByOrNull,
  updatedByOrNull,
} from '../common/schemas';

const createSchema = <
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

const buildAPISchemas = <R extends t.Props, O extends t.Props, D extends t.Props>(
  params: APIParams<R, O, D>
) => {
  return {
    create: createSchema(params.required, params.optional, params.defaultable),
    patch: patchSchema(params.required, params.optional, params.defaultable),
    response: responseSchema(params.required, params.optional, params.defaultable),
  };
};

interface APIParams<
  Required extends t.Props,
  Optional extends t.Props,
  Defaultable extends t.Props
> {
  required: Required;
  optional: Optional;
  defaultable: Defaultable;
}

const commonParams = {
  required: {
    name,
    description,
    risk_score,
    severity,
  },
  optional: {
    building_block_type,
    note,
    license,
    output_index,
    timeline_id,
    timeline_title,
    meta,
    rule_name_override,
    timestamp_override,
  },
  defaultable: {
    tags,
    interval,
    enabled,
    throttle: throttleOrNull,
    actions,
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
  },
};
const {
  create: commonCreateParams,
  patch: commonPatchParams,
  response: commonResponseParams,
} = buildAPISchemas(commonParams);

const eqlRuleParams = {
  required: {
    type: t.literal('eql'),
    language: t.literal('eql'),
    query,
  },
  optional: {
    index,
    filters,
    event_category_override,
  },
  defaultable: {},
};
const {
  create: eqlCreateParams,
  patch: eqlPatchParams,
  response: eqlResponseParams,
} = buildAPISchemas(eqlRuleParams);

const threatMatchRuleParams = {
  required: {
    type: t.literal('threat_match'),
    query,
    threat_query,
    threat_mapping,
    threat_index,
  },
  optional: {
    index,
    filters,
    saved_id,
    threat_filters,
    threat_language: t.keyof({ kuery: null, lucene: null }),
    concurrent_searches,
    items_per_search,
  },
  defaultable: {
    language: t.keyof({ kuery: null, lucene: null }),
  },
};
const {
  create: threatMatchCreateParams,
  patch: threatMatchPatchParams,
  response: threatMatchResponseParams,
} = buildAPISchemas(threatMatchRuleParams);

const queryRuleParams = {
  required: {
    type: t.literal('query'),
  },
  optional: {
    index,
    filters,
    saved_id,
  },
  defaultable: {
    query,
    language: t.keyof({ kuery: null, lucene: null }),
  },
};
const {
  create: queryCreateParams,
  patch: queryPatchParams,
  response: queryResponseParams,
} = buildAPISchemas(queryRuleParams);

const savedQueryRuleParams = {
  required: {
    type: t.literal('saved_query'),
    saved_id,
  },
  optional: {
    // Having language, query, and filters possibly defined adds more code confusion and probably user confusion
    // if the saved object gets deleted for some reason
    index,
    query,
    filters,
  },
  defaultable: {
    language: t.keyof({ kuery: null, lucene: null }),
  },
};
const {
  create: savedQueryCreateParams,
  patch: savedQueryPatchParams,
  response: savedQueryResponseParams,
} = buildAPISchemas(savedQueryRuleParams);

const thresholdRuleParams = {
  required: {
    type: t.literal('threshold'),
    query,
    threshold,
  },
  optional: {
    index,
    filters,
    saved_id,
  },
  defaultable: {
    language: t.keyof({ kuery: null, lucene: null }),
  },
};
const {
  create: thresholdCreateParams,
  patch: thresholdPatchParams,
  response: thresholdResponseParams,
} = buildAPISchemas(thresholdRuleParams);

const machineLearningRuleParams = {
  required: {
    type: t.literal('machine_learning'),
    anomaly_threshold,
    machine_learning_job_id,
  },
  optional: {},
  defaultable: {},
};
const {
  create: machineLearningCreateParams,
  patch: machineLearningPatchParams,
  response: machineLearningResponseParams,
} = buildAPISchemas(machineLearningRuleParams);

const createTypeSpecific = t.union([
  eqlCreateParams,
  threatMatchCreateParams,
  queryCreateParams,
  savedQueryCreateParams,
  thresholdCreateParams,
  machineLearningCreateParams,
]);
export type CreateTypeSpecific = t.TypeOf<typeof createTypeSpecific>;

// Convenience types for building specific types of rules
export const eqlCreateSchema = t.intersection([eqlCreateParams, commonCreateParams]);
export type EqlCreateSchema = t.TypeOf<typeof eqlCreateSchema>;

export const threatMatchCreateSchema = t.intersection([
  threatMatchCreateParams,
  commonCreateParams,
]);
export type ThreatMatchCreateSchema = t.TypeOf<typeof threatMatchCreateSchema>;

export const queryCreateSchema = t.intersection([queryCreateParams, commonCreateParams]);
export type QueryCreateSchema = t.TypeOf<typeof queryCreateSchema>;

export const savedQueryCreateSchema = t.intersection([savedQueryCreateParams, commonCreateParams]);
export type SavedQueryCreateSchema = t.TypeOf<typeof savedQueryCreateSchema>;

export const thresholdCreateSchema = t.intersection([thresholdCreateParams, commonCreateParams]);
export type ThresholdCreateSchema = t.TypeOf<typeof thresholdCreateSchema>;

export const machineLearningCreateSchema = t.intersection([
  machineLearningCreateParams,
  commonCreateParams,
]);
export type MachineLearningCreateSchema = t.TypeOf<typeof machineLearningCreateSchema>;

export const fullCreateSchema = t.intersection([commonCreateParams, createTypeSpecific]);
export type FullCreateSchema = t.TypeOf<typeof fullCreateSchema>;

const patchTypeSpecific = t.union([
  eqlPatchParams,
  threatMatchPatchParams,
  queryPatchParams,
  savedQueryPatchParams,
  thresholdPatchParams,
  machineLearningPatchParams,
]);

const responseTypeSpecific = t.union([
  eqlResponseParams,
  threatMatchResponseParams,
  queryResponseParams,
  savedQueryResponseParams,
  thresholdResponseParams,
  machineLearningResponseParams,
]);
export type ResponseTypeSpecific = t.TypeOf<typeof responseTypeSpecific>;

export const fullUpdateSchema = t.intersection([
  commonCreateParams,
  createTypeSpecific,
  t.exact(t.partial({ id })),
]);
export type FullUpdateSchema = t.TypeOf<typeof fullUpdateSchema>;

export const fullPatchSchema = t.intersection([
  commonPatchParams,
  patchTypeSpecific,
  t.exact(t.partial({ id })),
]);

const responseRequiredFields = {
  id,
  immutable,
  updated_at,
  updated_by: updatedByOrNull,
  created_at,
  created_by: createdByOrNull,
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
  commonResponseParams,
  responseTypeSpecific,
  t.exact(t.type(responseRequiredFields)),
  t.exact(t.partial(responseOptionalFields)),
]);
export type FullResponseSchema = t.TypeOf<typeof fullResponseSchema>;
