/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';

import {
  Actions,
  DefaultActionsArray,
  DefaultFromString,
  DefaultIntervalString,
  DefaultMaxSignalsNumber,
  DefaultRiskScoreMappingArray,
  DefaultSeverityMappingArray,
  DefaultThreatArray,
  DefaultThrottleNull,
  DefaultToString,
  From,
  RiskScoreMapping,
  machine_learning_job_id,
  risk_score,
  threat_index,
  concurrent_searches,
  items_per_search,
  threat_query,
  threat_filters,
  threat_mapping,
  threat_language,
  threat_indicator_path,
  Threats,
  type,
  language,
  severity,
  SeverityMapping,
  ThrottleOrNull,
  MaxSignals,
} from '@kbn/securitysolution-io-ts-alerting-types';
import {
  version,
  DefaultStringArray,
  DefaultBooleanFalse,
} from '@kbn/securitysolution-io-ts-types';

import { DefaultListArray, ListArray } from '@kbn/securitysolution-io-ts-list-types';
import {
  description,
  anomaly_threshold,
  filters,
  index,
  saved_id,
  timeline_id,
  timeline_title,
  meta,
  name,
  Tags,
  To,
  threshold,
  note,
  References,
  Enabled,
  FalsePositives,
  Interval,
  query,
  rule_id,
  building_block_type,
  license,
  rule_name_override,
  timestamp_override,
  Author,
  event_category_override,
  namespace,
} from '../common/schemas';

/**
 * Big differences between this schema and the createRulesSchema
 *  - rule_id is required here
 *  - output_index is not allowed (and instead the space index must be used)
 *  - immutable is forbidden but defaults to true instead of to false and it can only ever be true (This is forced directly in the route and not here)
 *  - enabled defaults to false instead of true
 *  - version is a required field that must exist
 *  - index is a required field that must exist if type !== machine_learning (Checked within the runtime type dependent system)
 */
export const addPrepackagedRulesSchema = t.intersection([
  t.exact(
    t.type({
      description,
      risk_score,
      name,
      severity,
      type,
      rule_id,
      version,
    })
  ),
  t.exact(
    t.partial({
      actions: DefaultActionsArray, // defaults to empty actions array if not set during decode
      anomaly_threshold, // defaults to undefined if not set during decode
      author: DefaultStringArray, // defaults to empty array of strings if not set during decode
      building_block_type, // defaults to undefined if not set during decode
      enabled: DefaultBooleanFalse, // defaults to false if not set during decode
      event_category_override, // defaults to "undefined" if not set during decode
      false_positives: DefaultStringArray, // defaults to empty string array if not set during decode
      filters, // defaults to undefined if not set during decode
      from: DefaultFromString, // defaults to "now-6m" if not set during decode
      index, // defaults to undefined if not set during decode
      interval: DefaultIntervalString, // defaults to "5m" if not set during decode
      query, // defaults to undefined if not set during decode
      language, // defaults to undefined if not set during decode
      license, // defaults to "undefined" if not set during decode
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
      exceptions_list: DefaultListArray, // defaults to empty array if not set during decode
      threat_filters, // defaults to "undefined" if not set during decode
      threat_mapping, // defaults to "undefined" if not set during decode
      threat_query, // defaults to "undefined" if not set during decode
      threat_index, // defaults to "undefined" if not set during decode
      threat_language, // defaults "undefined" if not set during decode
      threat_indicator_path, // defaults "undefined" if not set during decode
      concurrent_searches, // defaults to "undefined" if not set during decode
      items_per_search, // defaults to "undefined" if not set during decode
      namespace, // defaults to "undefined" if not set during decode
    })
  ),
]);
export type AddPrepackagedRulesSchema = t.TypeOf<typeof addPrepackagedRulesSchema>;

// This type is used after a decode since some things are defaults after a decode.
export type AddPrepackagedRulesSchemaDecoded = Omit<
  AddPrepackagedRulesSchema,
  | 'author'
  | 'references'
  | 'actions'
  | 'enabled'
  | 'false_positives'
  | 'from'
  | 'interval'
  | 'max_signals'
  | 'namespace'
  | 'risk_score_mapping'
  | 'severity_mapping'
  | 'tags'
  | 'to'
  | 'threat'
  | 'throttle'
  | 'exceptions_list'
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
  threat: Threats;
  throttle: ThrottleOrNull;
  exceptions_list: ListArray;
  namespace?: string;
};
