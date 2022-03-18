/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import { isObject } from 'lodash/fp';
import { Either, left, fold } from 'fp-ts/lib/Either';
import { pipe } from 'fp-ts/lib/pipeable';

import {
  actions,
  from,
  machine_learning_job_id,
  risk_score,
  DefaultRiskScoreMappingArray,
  DefaultSeverityMappingArray,
  threat_index,
  concurrent_searches,
  items_per_search,
  threat_query,
  threat_filters,
  threat_mapping,
  threat_language,
  threat_indicator_path,
  threats,
  type,
  language,
  severity,
  throttle,
  max_signals,
} from '@kbn/securitysolution-io-ts-alerting-types';
import { DefaultStringArray, version } from '@kbn/securitysolution-io-ts-types';

import { DefaultListArray } from '@kbn/securitysolution-io-ts-list-types';
import { isMlRule } from '../../../machine_learning/helpers';
import { isThresholdRule } from '../../utils';
import {
  anomaly_threshold,
  description,
  enabled,
  event_category_override,
  false_positives,
  id,
  immutable,
  index,
  interval,
  rule_id,
  name,
  output_index,
  query,
  references,
  updated_by,
  tags,
  to,
  created_at,
  created_by,
  updated_at,
  saved_id,
  timeline_id,
  timeline_title,
  threshold,
  filters,
  meta,
  outcome,
  alias_target_id,
  alias_purpose,
  note,
  building_block_type,
  license,
  rule_name_override,
  timestamp_override,
  namespace,
  ruleExecutionSummary,
} from '../common';

import { typeAndTimelineOnlySchema, TypeAndTimelineOnly } from './type_timeline_only_schema';

/**
 * This is the required fields for the rules schema response. Put all required properties on
 * this base for schemas such as create_rules, update_rules, for the correct validation of the
 * output schema.
 */
export const requiredRulesSchema = t.type({
  author: DefaultStringArray,
  description,
  enabled,
  false_positives,
  from,
  id,
  immutable,
  interval,
  rule_id,
  output_index,
  max_signals,
  risk_score,
  risk_score_mapping: DefaultRiskScoreMappingArray,
  name,
  references,
  severity,
  severity_mapping: DefaultSeverityMappingArray,
  updated_by,
  tags,
  to,
  type,
  threat: threats,
  created_at,
  updated_at,
  created_by,
  version,
  exceptions_list: DefaultListArray,
});

export type RequiredRulesSchema = t.TypeOf<typeof requiredRulesSchema>;

/**
 * If you have type dependents or exclusive or situations add them here AND update the
 * check_type_dependents file for whichever REST flow it is going through.
 */
export const dependentRulesSchema = t.partial({
  // query fields
  language,
  query,

  // eql only fields
  event_category_override,

  // when type = saved_query, saved_id is required
  saved_id,

  // These two are required together or not at all.
  timeline_id,
  timeline_title,

  // ML fields
  anomaly_threshold,
  machine_learning_job_id,

  // Threshold fields
  threshold,

  // Threat Match fields
  threat_filters,
  threat_index,
  threat_query,
  concurrent_searches,
  items_per_search,
  threat_mapping,
  threat_language,
  threat_indicator_path,
});

/**
 * This is the partial or optional fields for the rules schema. Put all optional
 * properties on this. DO NOT PUT type dependents such as xor relationships here.
 * Instead use dependentRulesSchema and check_type_dependents for how to do those.
 */
export const partialRulesSchema = t.partial({
  actions,
  building_block_type,
  license,
  throttle,
  rule_name_override,
  timestamp_override,
  filters,
  meta,
  outcome,
  alias_target_id,
  alias_purpose,
  index,
  namespace,
  note,
  uuid: id, // Move to 'required' post-migration
  execution_summary: ruleExecutionSummary,
});

/**
 * This is the rules schema WITHOUT typeDependents. You don't normally want to use this for a decode
 */
export const rulesWithoutTypeDependentsSchema = t.intersection([
  t.exact(dependentRulesSchema),
  t.exact(partialRulesSchema),
  t.exact(requiredRulesSchema),
]);
export type RulesWithoutTypeDependentsSchema = t.TypeOf<typeof rulesWithoutTypeDependentsSchema>;

/**
 * This is the rulesSchema you want to use for checking type dependents and all the properties
 * through: rulesSchema.decode(someJSONObject)
 */
export const rulesSchema = new t.Type<
  RulesWithoutTypeDependentsSchema,
  RulesWithoutTypeDependentsSchema,
  unknown
>(
  'RulesSchema',
  (input: unknown): input is RulesWithoutTypeDependentsSchema => isObject(input),
  (input): Either<t.Errors, RulesWithoutTypeDependentsSchema> => {
    return checkTypeDependents(input);
  },
  t.identity
);

/**
 * This is the correct type you want to use for Rules that are outputted from the
 * REST interface. This has all base and all optional properties merged together.
 */
export type RulesSchema = t.TypeOf<typeof rulesSchema>;

export const addSavedId = (typeAndTimelineOnly: TypeAndTimelineOnly): t.Mixed[] => {
  if (typeAndTimelineOnly.type === 'saved_query') {
    return [t.exact(t.type({ saved_id: dependentRulesSchema.props.saved_id }))];
  } else {
    return [];
  }
};

export const addTimelineTitle = (typeAndTimelineOnly: TypeAndTimelineOnly): t.Mixed[] => {
  if (typeAndTimelineOnly.timeline_id != null) {
    return [
      t.exact(t.type({ timeline_title: dependentRulesSchema.props.timeline_title })),
      t.exact(t.type({ timeline_id: dependentRulesSchema.props.timeline_id })),
    ];
  } else {
    return [];
  }
};

export const addQueryFields = (typeAndTimelineOnly: TypeAndTimelineOnly): t.Mixed[] => {
  if (['query', 'saved_query', 'threshold', 'threat_match'].includes(typeAndTimelineOnly.type)) {
    return [
      t.exact(t.type({ query: dependentRulesSchema.props.query })),
      t.exact(t.type({ language: dependentRulesSchema.props.language })),
    ];
  } else {
    return [];
  }
};

export const addMlFields = (typeAndTimelineOnly: TypeAndTimelineOnly): t.Mixed[] => {
  if (isMlRule(typeAndTimelineOnly.type)) {
    return [
      t.exact(t.type({ anomaly_threshold: dependentRulesSchema.props.anomaly_threshold })),
      t.exact(
        t.type({ machine_learning_job_id: dependentRulesSchema.props.machine_learning_job_id })
      ),
    ];
  } else {
    return [];
  }
};

export const addThresholdFields = (typeAndTimelineOnly: TypeAndTimelineOnly): t.Mixed[] => {
  if (isThresholdRule(typeAndTimelineOnly.type)) {
    return [
      t.exact(t.type({ threshold: dependentRulesSchema.props.threshold })),
      t.exact(t.partial({ saved_id: dependentRulesSchema.props.saved_id })),
    ];
  } else {
    return [];
  }
};

export const addEqlFields = (typeAndTimelineOnly: TypeAndTimelineOnly): t.Mixed[] => {
  if (typeAndTimelineOnly.type === 'eql') {
    return [
      t.exact(
        t.partial({ event_category_override: dependentRulesSchema.props.event_category_override })
      ),
      t.exact(t.type({ query: dependentRulesSchema.props.query })),
      t.exact(t.type({ language: dependentRulesSchema.props.language })),
    ];
  } else {
    return [];
  }
};

export const addThreatMatchFields = (typeAndTimelineOnly: TypeAndTimelineOnly): t.Mixed[] => {
  if (typeAndTimelineOnly.type === 'threat_match') {
    return [
      t.exact(t.type({ threat_query: dependentRulesSchema.props.threat_query })),
      t.exact(t.type({ threat_index: dependentRulesSchema.props.threat_index })),
      t.exact(t.type({ threat_mapping: dependentRulesSchema.props.threat_mapping })),
      t.exact(t.partial({ threat_language: dependentRulesSchema.props.threat_language })),
      t.exact(t.partial({ threat_filters: dependentRulesSchema.props.threat_filters })),
      t.exact(
        t.partial({ threat_indicator_path: dependentRulesSchema.props.threat_indicator_path })
      ),
      t.exact(t.partial({ saved_id: dependentRulesSchema.props.saved_id })),
      t.exact(t.partial({ concurrent_searches: dependentRulesSchema.props.concurrent_searches })),
      t.exact(
        t.partial({
          items_per_search: dependentRulesSchema.props.items_per_search,
        })
      ),
    ];
  } else {
    return [];
  }
};

export const getDependents = (typeAndTimelineOnly: TypeAndTimelineOnly): t.Mixed => {
  const dependents: t.Mixed[] = [
    t.exact(requiredRulesSchema),
    t.exact(partialRulesSchema),
    ...addSavedId(typeAndTimelineOnly),
    ...addTimelineTitle(typeAndTimelineOnly),
    ...addQueryFields(typeAndTimelineOnly),
    ...addMlFields(typeAndTimelineOnly),
    ...addThresholdFields(typeAndTimelineOnly),
    ...addEqlFields(typeAndTimelineOnly),
    ...addThreatMatchFields(typeAndTimelineOnly),
  ];

  if (dependents.length > 1) {
    // This unsafe cast is because t.intersection does not use an array but rather a set of
    // tuples and really does not look like they expected us to ever dynamically build up
    // intersections, but here we are doing that. Looking at their code, although they limit
    // the array elements to 5, it looks like you have N number of intersections
    const unsafeCast: [t.Mixed, t.Mixed] = dependents as [t.Mixed, t.Mixed];
    return t.intersection(unsafeCast);
  } else {
    // We are not allowed to call t.intersection with a single value so we return without
    // it here normally.
    return dependents[0];
  }
};

export const checkTypeDependents = (input: unknown): Either<t.Errors, RequiredRulesSchema> => {
  const typeOnlyDecoded = typeAndTimelineOnlySchema.decode(input);
  const onLeft = (errors: t.Errors): Either<t.Errors, RequiredRulesSchema> => left(errors);
  const onRight = (
    typeAndTimelineOnly: TypeAndTimelineOnly
  ): Either<t.Errors, RequiredRulesSchema> => {
    const intersections = getDependents(typeAndTimelineOnly);
    return intersections.decode(input);
  };
  return pipe(typeOnlyDecoded, fold(onLeft, onRight));
};
