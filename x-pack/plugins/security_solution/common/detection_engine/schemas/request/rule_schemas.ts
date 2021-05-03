/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';

import { listArray } from '../types/lists';
import {
  threat_filters,
  threat_query,
  threat_mapping,
  threat_index,
  threat_indicator_path,
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
  threats,
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
  updated_by,
  created_at,
  created_by,
  job_status,
  status_date,
  last_success_at,
  last_success_message,
  last_failure_at,
  last_failure_message,
  throttle,
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

const baseParams = {
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
    throttle,
    actions,
    author,
    false_positives,
    from,
    // maxSignals not used in ML rules but probably should be used
    max_signals,
    risk_score_mapping,
    severity_mapping,
    threat: threats,
    to,
    references,
    version,
    exceptions_list: listArray,
  },
};
const {
  create: baseCreateParams,
  patch: basePatchParams,
  response: baseResponseParams,
} = buildAPISchemas(baseParams);

// "shared" types are the same across all rule types, and built from "baseParams" above
// with some variations for each route. These intersect with type specific schemas below
// to create the full schema for each route.
export const sharedCreateSchema = t.intersection([
  baseCreateParams,
  t.exact(t.partial({ rule_id })),
]);
export type SharedCreateSchema = t.TypeOf<typeof sharedCreateSchema>;

export const sharedUpdateSchema = t.intersection([
  baseCreateParams,
  t.exact(t.partial({ rule_id })),
  t.exact(t.partial({ id })),
]);
export type SharedUpdateSchema = t.TypeOf<typeof sharedUpdateSchema>;

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
    threat_indicator_path,
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
type CreateSchema<T> = SharedCreateSchema & T;
export type EqlCreateSchema = CreateSchema<t.TypeOf<typeof eqlCreateParams>>;
export type ThreatMatchCreateSchema = CreateSchema<t.TypeOf<typeof threatMatchCreateParams>>;
export type QueryCreateSchema = CreateSchema<t.TypeOf<typeof queryCreateParams>>;
export type SavedQueryCreateSchema = CreateSchema<t.TypeOf<typeof savedQueryCreateParams>>;
export type ThresholdCreateSchema = CreateSchema<t.TypeOf<typeof thresholdCreateParams>>;
export type MachineLearningCreateSchema = CreateSchema<
  t.TypeOf<typeof machineLearningCreateParams>
>;

export const createRulesSchema = t.intersection([sharedCreateSchema, createTypeSpecific]);
export type CreateRulesSchema = t.TypeOf<typeof createRulesSchema>;

type UpdateSchema<T> = SharedUpdateSchema & T;
export type EqlUpdateSchema = UpdateSchema<t.TypeOf<typeof eqlCreateParams>>;
export type ThreatMatchUpdateSchema = UpdateSchema<t.TypeOf<typeof threatMatchCreateParams>>;
export type QueryUpdateSchema = UpdateSchema<t.TypeOf<typeof queryCreateParams>>;
export type SavedQueryUpdateSchema = UpdateSchema<t.TypeOf<typeof savedQueryCreateParams>>;
export type ThresholdUpdateSchema = UpdateSchema<t.TypeOf<typeof thresholdCreateParams>>;
export type MachineLearningUpdateSchema = UpdateSchema<
  t.TypeOf<typeof machineLearningCreateParams>
>;

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

export const updateRulesSchema = t.intersection([createTypeSpecific, sharedUpdateSchema]);
export type UpdateRulesSchema = t.TypeOf<typeof updateRulesSchema>;

export const fullPatchSchema = t.intersection([
  basePatchParams,
  patchTypeSpecific,
  t.exact(t.partial({ id })),
]);

const responseRequiredFields = {
  id,
  rule_id,
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
  baseResponseParams,
  responseTypeSpecific,
  t.exact(t.type(responseRequiredFields)),
  t.exact(t.partial(responseOptionalFields)),
]);
export type FullResponseSchema = t.TypeOf<typeof fullResponseSchema>;
