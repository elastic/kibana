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
  building_block_type,
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
  threshold,
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
  DefaultListArray,
  ListArray,
  DefaultUuid,
  DefaultRiskScoreMappingArray,
  DefaultSeverityMappingArray,
} from '../types';

export const createRulesSchema = t.intersection([
  t.exact(
    t.type({
      description,
      risk_score,
      name,
      severity,
      type,
    })
  ),
  t.exact(
    t.partial({
      actions: DefaultActionsArray, // defaults to empty actions array if not set during decode
      anomaly_threshold, // defaults to undefined if not set during decode
      author: DefaultStringArray, // defaults to empty array of strings if not set during decode
      building_block_type, // defaults to undefined if not set during decode
      enabled: DefaultBooleanTrue, // defaults to true if not set during decode
      false_positives: DefaultStringArray, // defaults to empty string array if not set during decode
      filters, // defaults to undefined if not set during decode
      from: DefaultFromString, // defaults to "now-6m" if not set during decode
      rule_id: DefaultUuid,
      index, // defaults to undefined if not set during decode
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
      threshold, // defaults to "undefined" if not set during decode
      throttle: DefaultThrottleNull, // defaults to "null" if not set during decode
      timestamp_override, // defaults to "undefined" if not set during decode
      references: DefaultStringArray, // defaults to empty array of strings if not set during decode
      note, // defaults to "undefined" if not set during decode
      version: DefaultVersionNumber, // defaults to 1 if not set during decode
      exceptions_list: DefaultListArray, // defaults to empty array if not set during decode
    })
  ),
]);

export type CreateRulesSchema = t.TypeOf<typeof createRulesSchema>;

// This type is used after a decode since some things are defaults after a decode.
export type CreateRulesSchemaDecoded = Omit<
  CreateRulesSchema,
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
};
