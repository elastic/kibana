/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as t from 'io-ts';

/* eslint-disable @typescript-eslint/camelcase */
import {
  description,
  anomaly_threshold,
  filters,
  RuleId,
  index,
  output_index,
  saved_id,
  timeline_id,
  timeline_title,
  meta,
  machine_learning_job_id,
  risk_score,
  MaxSignals,
  name,
  severity,
  Tags,
  To,
  type,
  Threat,
  ThrottleOrNull,
  note,
  Version,
  References,
  Actions,
  Enabled,
  FalsePositives,
  From,
  Interval,
  language,
  query,
  rule_id,
  id,
  created_at,
  updated_at,
  created_by,
  updated_by,
  building_block_type,
  license,
  rule_name_override,
  timestamp_override,
  Author,
  RiskScoreMapping,
  SeverityMapping,
} from '../common/schemas';
/* eslint-enable @typescript-eslint/camelcase */

import {
  DefaultStringArray,
  DefaultActionsArray,
  DefaultBooleanTrue,
  DefaultFromString,
  DefaultIntervalString,
  DefaultMaxSignalsNumber,
  DefaultToString,
  DefaultThreatArray,
  DefaultThrottleNull,
  DefaultVersionNumber,
  OnlyFalseAllowed,
  DefaultStringBooleanFalse,
  DefaultListArray,
  ListArray,
  DefaultRiskScoreMappingArray,
  DefaultSeverityMappingArray,
} from '../types';

/**
 * Differences from this and the createRulesSchema are
 *   - rule_id is required
 *   - id is optional (but ignored in the import code - rule_id is exclusively used for imports)
 *   - immutable is optional but if it is any value other than false it will be rejected
 *   - created_at is optional (but ignored in the import code)
 *   - updated_at is optional (but ignored in the import code)
 *   - created_by is optional (but ignored in the import code)
 *   - updated_by is optional (but ignored in the import code)
 */
export const importRulesSchema = t.intersection([
  t.exact(
    t.type({
      description,
      risk_score,
      name,
      severity,
      type,
      rule_id,
    })
  ),
  t.exact(
    t.partial({
      id, // defaults to undefined if not set during decode
      actions: DefaultActionsArray, // defaults to empty actions array if not set during decode
      anomaly_threshold, // defaults to undefined if not set during decode
      author: DefaultStringArray, // defaults to empty array of strings if not set during decode
      building_block_type, // defaults to undefined if not set during decode
      enabled: DefaultBooleanTrue, // defaults to true if not set during decode
      false_positives: DefaultStringArray, // defaults to empty string array if not set during decode
      filters, // defaults to undefined if not set during decode
      from: DefaultFromString, // defaults to "now-6m" if not set during decode
      index, // defaults to undefined if not set during decode
      immutable: OnlyFalseAllowed, // defaults to "false" if not set during decode
      interval: DefaultIntervalString, // defaults to "5m" if not set during decode
      query, // defaults to undefined if not set during decode
      language, // defaults to undefined if not set during decode
      license, // defaults to "undefined" if not set during decode
      // TODO: output_index: This should be removed eventually
      output_index, // defaults to "undefined" if not set during decode
      saved_id, // defaults to "undefined" if not set during decode
      timeline_id, // defaults to "undefined" if not set during decode
      timeline_title, // defaults to "undefined" if not set during decode
      meta, // defaults to "undefined" if not set during decode
      machine_learning_job_id, // defaults to "undefined" if not set during decode
      max_signals: DefaultMaxSignalsNumber, // defaults to DEFAULT_MAX_SIGNALS (100) if not set during decode
      risk_score_mapping: DefaultRiskScoreMappingArray, // defaults to empty risk score mapping array if not set during decode
      rule_name_override, // defaults to "undefined" if not set during decode
      severity_mapping: DefaultSeverityMappingArray, // defaults to empty actions array if not set during decode
      tags: DefaultStringArray, // defaults to empty string array if not set during decode
      to: DefaultToString, // defaults to "now" if not set during decode
      threat: DefaultThreatArray, // defaults to empty array if not set during decode
      throttle: DefaultThrottleNull, // defaults to "null" if not set during decode
      timestamp_override, // defaults to "undefined" if not set during decode
      references: DefaultStringArray, // defaults to empty array of strings if not set during decode
      note, // defaults to "undefined" if not set during decode
      version: DefaultVersionNumber, // defaults to 1 if not set during decode
      exceptions_list: DefaultListArray, // defaults to empty array if not set during decode
      created_at, // defaults "undefined" if not set during decode
      updated_at, // defaults "undefined" if not set during decode
      created_by, // defaults "undefined" if not set during decode
      updated_by, // defaults "undefined" if not set during decode
    })
  ),
]);

export type ImportRulesSchema = t.TypeOf<typeof importRulesSchema>;

// This type is used after a decode since some things are defaults after a decode.
export type ImportRulesSchemaDecoded = Omit<
  ImportRulesSchema,
  | 'author'
  | 'references'
  | 'actions'
  | 'enabled'
  | 'false_positives'
  | 'from'
  | 'interval'
  | 'max_signals'
  | 'risk_score_mapping'
  | 'severity_mapping'
  | 'tags'
  | 'to'
  | 'threat'
  | 'throttle'
  | 'version'
  | 'exceptions_list'
  | 'rule_id'
  | 'immutable'
> & {
  author: Author;
  references: References;
  actions: Actions;
  enabled: Enabled;
  false_positives: FalsePositives;
  from: From;
  interval: Interval;
  max_signals: MaxSignals;
  risk_score_mapping: RiskScoreMapping;
  severity_mapping: SeverityMapping;
  tags: Tags;
  to: To;
  threat: Threat;
  throttle: ThrottleOrNull;
  version: Version;
  exceptions_list: ListArray;
  rule_id: RuleId;
  immutable: false;
};

export const importRulesQuerySchema = t.exact(
  t.partial({
    overwrite: DefaultStringBooleanFalse,
  })
);

export type ImportRulesQuerySchema = t.TypeOf<typeof importRulesQuerySchema>;
export type ImportRulesQuerySchemaDecoded = Omit<ImportRulesQuerySchema, 'overwrite'> & {
  overwrite: boolean;
};

export const importRulesPayloadSchema = t.exact(
  t.type({
    file: t.object,
  })
);

export type ImportRulesPayloadSchema = t.TypeOf<typeof importRulesPayloadSchema>;

export type ImportRulesPayloadSchemaDecoded = ImportRulesPayloadSchema;
