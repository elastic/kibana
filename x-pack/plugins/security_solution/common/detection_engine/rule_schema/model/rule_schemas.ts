/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';

import {
  concurrent_searches,
  items_per_search,
  machine_learning_job_id,
  RiskScore,
  RiskScoreMapping,
  RuleActionArray,
  RuleActionThrottle,
  RuleInterval,
  RuleIntervalFrom,
  RuleIntervalTo,
  Severity,
  SeverityMapping,
  threat_filters,
  threat_index,
  threat_indicator_path,
  threat_mapping,
  threat_query,
} from '@kbn/securitysolution-io-ts-alerting-types';

import { RuleExecutionSummary } from '../../rule_monitoring';
import { ResponseActionArray } from '../../rule_response_actions/schemas';
import {
  AlertsIndex,
  AlertsIndexNamespace,
  BuildingBlockType,
  DataViewId,
  EventCategoryOverride,
  ExceptionListArray,
  IndexPatternArray,
  InvestigationGuide,
  IsRuleEnabled,
  IsRuleImmutable,
  MaxSignals,
  RelatedIntegrationArray,
  RequiredFieldArray,
  RuleAuthorArray,
  RuleDescription,
  RuleFalsePositiveArray,
  RuleFilterArray,
  RuleLicense,
  RuleMetadata,
  RuleName,
  RuleNameOverride,
  RuleObjectId,
  RuleQuery,
  RuleReferenceArray,
  RuleSignatureId,
  RuleTagArray,
  RuleVersion,
  SavedObjectResolveAliasPurpose,
  SavedObjectResolveAliasTargetId,
  SavedObjectResolveOutcome,
  SetupGuide,
  ThreatArray,
  TiebreakerField,
  TimelineTemplateId,
  TimelineTemplateTitle,
  TimestampField,
  TimestampOverride,
  TimestampOverrideFallbackDisabled,
} from '..';
import {
  saved_id,
  threshold,
  anomaly_threshold,
  updated_at,
  updated_by,
  created_at,
  created_by,
  newTermsFields,
  historyWindowStart,
} from '../../schemas/common';

export const createSchema = <
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
    t.partial(requiredFields),
    t.partial(optionalFields),
    t.partial(defaultableFields),
  ]);
};

type OrUndefined<P extends t.Props> = {
  [K in keyof P]: P[K] | t.UndefinedC;
};

export const responseSchema = <
  Required extends t.Props,
  Optional extends t.Props,
  Defaultable extends t.Props
>(
  requiredFields: Required,
  optionalFields: Optional,
  defaultableFields: Defaultable
) => {
  // This bit of logic is to force all fields to be accounted for in conversions from the internal
  // rule schema to the response schema. Rather than use `t.partial`, which makes each field optional,
  // we make each field required but possibly undefined. The result is that if a field is forgotten in
  // the conversion from internal schema to response schema TS will report an error. If we just used t.partial
  // instead, then optional fields can be accidentally omitted from the conversion - and any actual values
  // in those fields internally will be stripped in the response.
  const optionalWithUndefined = Object.keys(optionalFields).reduce<t.Props>((acc, key) => {
    acc[key] = t.union([optionalFields[key], t.undefined]);
    return acc;
  }, {}) as OrUndefined<Optional>;
  return t.intersection([
    t.exact(t.type(requiredFields)),
    t.exact(t.type(optionalWithUndefined)),
    t.exact(t.type(defaultableFields)),
  ]);
};

export const buildAPISchemas = <R extends t.Props, O extends t.Props, D extends t.Props>(
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
    // Main attributes
    name: RuleName,
    description: RuleDescription,
    // Severity and risk score
    severity: Severity,
    risk_score: RiskScore,
  },
  optional: {
    // Main attributes
    meta: RuleMetadata,
    // Field overrides
    rule_name_override: RuleNameOverride,
    timestamp_override: TimestampOverride,
    timestamp_override_fallback_disabled: TimestampOverrideFallbackDisabled,
    // Timeline template
    timeline_id: TimelineTemplateId,
    timeline_title: TimelineTemplateTitle,
    // Atributes related to SavedObjectsClient.resolve API
    outcome: SavedObjectResolveOutcome,
    alias_target_id: SavedObjectResolveAliasTargetId,
    alias_purpose: SavedObjectResolveAliasPurpose,
    // Misc attributes
    license: RuleLicense,
    note: InvestigationGuide,
    building_block_type: BuildingBlockType,
    output_index: AlertsIndex,
    namespace: AlertsIndexNamespace,
  },
  defaultable: {
    // Main attributes
    version: RuleVersion,
    tags: RuleTagArray,
    enabled: IsRuleEnabled,
    // Field overrides
    risk_score_mapping: RiskScoreMapping,
    severity_mapping: SeverityMapping,
    // Rule schedule
    interval: RuleInterval,
    from: RuleIntervalFrom,
    to: RuleIntervalTo,
    // Rule actions
    actions: RuleActionArray,
    throttle: RuleActionThrottle,
    // Rule exceptions
    exceptions_list: ExceptionListArray,
    // Misc attributes
    author: RuleAuthorArray,
    false_positives: RuleFalsePositiveArray,
    references: RuleReferenceArray,
    // maxSignals not used in ML rules but probably should be used
    max_signals: MaxSignals,
    threat: ThreatArray,
  },
};
const {
  create: baseCreateParams,
  patch: basePatchParams,
  response: baseResponseParams,
} = buildAPISchemas(baseParams);
export { baseCreateParams };

// "shared" types are the same across all rule types, and built from "baseParams" above
// with some variations for each route. These intersect with type specific schemas below
// to create the full schema for each route.
export const sharedCreateSchema = t.intersection([
  baseCreateParams,
  t.exact(t.partial({ rule_id: RuleSignatureId })),
]);
export type SharedCreateSchema = t.TypeOf<typeof sharedCreateSchema>;

export const sharedUpdateSchema = t.intersection([
  baseCreateParams,
  t.exact(t.partial({ rule_id: RuleSignatureId })),
  t.exact(t.partial({ id: RuleObjectId })),
]);
export type SharedUpdateSchema = t.TypeOf<typeof sharedUpdateSchema>;

export const sharedPatchSchema = t.intersection([
  basePatchParams,
  t.exact(t.partial({ rule_id: RuleSignatureId, id: RuleObjectId })),
]);

// START type specific parameter definitions
// -----------------------------------------
const eqlRuleParams = {
  required: {
    type: t.literal('eql'),
    language: t.literal('eql'),
    query: RuleQuery,
  },
  optional: {
    index: IndexPatternArray,
    data_view_id: DataViewId,
    filters: RuleFilterArray,
    event_category_override: EventCategoryOverride,
    timestamp_field: TimestampField,
    tiebreaker_field: TiebreakerField,
  },
  defaultable: {},
};
const {
  create: eqlCreateParams,
  patch: eqlPatchParams,
  response: eqlResponseParams,
} = buildAPISchemas(eqlRuleParams);
export { eqlCreateParams, eqlResponseParams };

const threatMatchRuleParams = {
  required: {
    type: t.literal('threat_match'),
    query: RuleQuery,
    threat_query,
    threat_mapping,
    threat_index,
  },
  optional: {
    index: IndexPatternArray,
    data_view_id: DataViewId,
    filters: RuleFilterArray,
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
export { threatMatchCreateParams, threatMatchResponseParams };

const queryRuleParams = {
  required: {
    type: t.literal('query'),
  },
  optional: {
    index: IndexPatternArray,
    data_view_id: DataViewId,
    filters: RuleFilterArray,
    saved_id,
    response_actions: ResponseActionArray,
  },
  defaultable: {
    query: RuleQuery,
    language: t.keyof({ kuery: null, lucene: null }),
  },
};
const {
  create: queryCreateParams,
  patch: queryPatchParams,
  response: queryResponseParams,
} = buildAPISchemas(queryRuleParams);

export { queryCreateParams, queryResponseParams };

const savedQueryRuleParams = {
  required: {
    type: t.literal('saved_query'),
    saved_id,
  },
  optional: {
    // Having language, query, and filters possibly defined adds more code confusion and probably user confusion
    // if the saved object gets deleted for some reason
    index: IndexPatternArray,
    data_view_id: DataViewId,
    query: RuleQuery,
    filters: RuleFilterArray,
    response_actions: ResponseActionArray,
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

export { savedQueryCreateParams, savedQueryResponseParams };

const thresholdRuleParams = {
  required: {
    type: t.literal('threshold'),
    query: RuleQuery,
    threshold,
  },
  optional: {
    index: IndexPatternArray,
    data_view_id: DataViewId,
    filters: RuleFilterArray,
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

export { thresholdCreateParams, thresholdResponseParams };

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

export { machineLearningCreateParams, machineLearningResponseParams };

const newTermsRuleParams = {
  required: {
    type: t.literal('new_terms'),
    query: RuleQuery,
    new_terms_fields: newTermsFields,
    history_window_start: historyWindowStart,
  },
  optional: {
    index: IndexPatternArray,
    data_view_id: DataViewId,
    filters: RuleFilterArray,
  },
  defaultable: {
    language: t.keyof({ kuery: null, lucene: null }),
  },
};
const {
  create: newTermsCreateParams,
  patch: newTermsPatchParams,
  response: newTermsResponseParams,
} = buildAPISchemas(newTermsRuleParams);

export { newTermsCreateParams, newTermsResponseParams };
// ---------------------------------------
// END type specific parameter definitions

export const createTypeSpecific = t.union([
  eqlCreateParams,
  threatMatchCreateParams,
  queryCreateParams,
  savedQueryCreateParams,
  thresholdCreateParams,
  machineLearningCreateParams,
  newTermsCreateParams,
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
export type NewTermsCreateSchema = CreateSchema<t.TypeOf<typeof newTermsCreateParams>>;

export const createRulesSchema = t.intersection([sharedCreateSchema, createTypeSpecific]);
export type CreateRulesSchema = t.TypeOf<typeof createRulesSchema>;
export const previewRulesSchema = t.intersection([
  sharedCreateSchema,
  createTypeSpecific,
  t.type({ invocationCount: t.number, timeframeEnd: t.string }),
]);
export type PreviewRulesSchema = t.TypeOf<typeof previewRulesSchema>;

type UpdateSchema<T> = SharedUpdateSchema & T;
export type QueryUpdateSchema = UpdateSchema<t.TypeOf<typeof queryCreateParams>>;
export type MachineLearningUpdateSchema = UpdateSchema<
  t.TypeOf<typeof machineLearningCreateParams>
>;
export type NewTermsUpdateSchema = UpdateSchema<t.TypeOf<typeof newTermsCreateParams>>;

export const patchTypeSpecific = t.union([
  eqlPatchParams,
  threatMatchPatchParams,
  queryPatchParams,
  savedQueryPatchParams,
  thresholdPatchParams,
  machineLearningPatchParams,
  newTermsPatchParams,
]);
export {
  eqlPatchParams,
  threatMatchPatchParams,
  queryPatchParams,
  savedQueryPatchParams,
  thresholdPatchParams,
  machineLearningPatchParams,
  newTermsPatchParams,
};

export type EqlPatchParams = t.TypeOf<typeof eqlPatchParams>;
export type ThreatMatchPatchParams = t.TypeOf<typeof threatMatchPatchParams>;
export type QueryPatchParams = t.TypeOf<typeof queryPatchParams>;
export type SavedQueryPatchParams = t.TypeOf<typeof savedQueryPatchParams>;
export type ThresholdPatchParams = t.TypeOf<typeof thresholdPatchParams>;
export type MachineLearningPatchParams = t.TypeOf<typeof machineLearningPatchParams>;
export type NewTermsPatchParams = t.TypeOf<typeof newTermsPatchParams>;

const responseTypeSpecific = t.union([
  eqlResponseParams,
  threatMatchResponseParams,
  queryResponseParams,
  savedQueryResponseParams,
  thresholdResponseParams,
  machineLearningResponseParams,
  newTermsResponseParams,
]);
export type ResponseTypeSpecific = t.TypeOf<typeof responseTypeSpecific>;

export const updateRulesSchema = t.intersection([createTypeSpecific, sharedUpdateSchema]);
export type UpdateRulesSchema = t.TypeOf<typeof updateRulesSchema>;

const responseRequiredFields = {
  id: RuleObjectId,
  rule_id: RuleSignatureId,
  immutable: IsRuleImmutable,
  updated_at,
  updated_by,
  created_at,
  created_by,

  // NOTE: For now, Related Integrations, Required Fields and Setup Guide are supported for prebuilt
  // rules only. We don't want to allow users to edit these 3 fields via the API. If we added them
  // to baseParams.defaultable, they would become a part of the request schema as optional fields.
  // This is why we add them here, in order to add them only to the response schema.
  related_integrations: RelatedIntegrationArray,
  required_fields: RequiredFieldArray,
  setup: SetupGuide,
};

const responseOptionalFields = {
  execution_summary: RuleExecutionSummary,
};

const sharedResponseSchema = t.intersection([
  baseResponseParams,
  t.exact(t.type(responseRequiredFields)),
  t.exact(t.partial(responseOptionalFields)),
]);
export type SharedResponseSchema = t.TypeOf<typeof sharedResponseSchema>;
export const fullResponseSchema = t.intersection([sharedResponseSchema, responseTypeSpecific]);
export type FullResponseSchema = t.TypeOf<typeof fullResponseSchema>;

// Convenience types for type specific responses
type ResponseSchema<T> = SharedResponseSchema & T;
export type EqlResponseSchema = ResponseSchema<t.TypeOf<typeof eqlResponseParams>>;
export type ThreatMatchResponseSchema = ResponseSchema<t.TypeOf<typeof threatMatchResponseParams>>;
export type QueryResponseSchema = ResponseSchema<t.TypeOf<typeof queryResponseParams>>;
export type SavedQueryResponseSchema = ResponseSchema<t.TypeOf<typeof savedQueryResponseParams>>;
export type ThresholdResponseSchema = ResponseSchema<t.TypeOf<typeof thresholdResponseParams>>;
export type MachineLearningResponseSchema = ResponseSchema<
  t.TypeOf<typeof machineLearningResponseParams>
>;
export type NewTermsResponseSchema = ResponseSchema<t.TypeOf<typeof newTermsResponseParams>>;

export interface RulePreviewLogs {
  errors: string[];
  warnings: string[];
  startedAt?: string;
  duration: number;
}

export interface PreviewResponse {
  previewId: string | undefined;
  logs: RulePreviewLogs[] | undefined;
  isAborted: boolean | undefined;
}
