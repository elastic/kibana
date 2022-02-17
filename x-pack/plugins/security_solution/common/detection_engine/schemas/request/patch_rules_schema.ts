/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';

import {
  actions,
  from,
  machine_learning_job_id,
  risk_score,
  risk_score_mapping,
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
  severity_mapping,
  max_signals,
  throttle,
} from '@kbn/securitysolution-io-ts-alerting-types';

import { version } from '@kbn/securitysolution-io-ts-types';

import { listArrayOrUndefined } from '@kbn/securitysolution-io-ts-list-types';
import {
  description,
  anomaly_threshold,
  filters,
  index,
  output_index,
  saved_id,
  timeline_id,
  timeline_title,
  meta,
  rule_id,
  name,
  note,
  false_positives,
  interval,
  enabled,
  tags,
  threshold,
  references,
  to,
  query,
  id,
  building_block_type,
  author,
  license,
  rule_name_override,
  timestamp_override,
  event_category_override,
} from '../common/schemas';

/**
 * All of the patch elements should default to undefined if not set
 */
export const patchRulesSchema = t.exact(
  t.partial({
    author,
    building_block_type,
    description,
    risk_score,
    name,
    severity,
    type,
    id,
    actions,
    anomaly_threshold,
    enabled,
    event_category_override,
    false_positives,
    filters,
    from,
    rule_id,
    index,
    interval,
    query,
    language,
    license,
    // TODO: output_index: This should be removed eventually
    output_index,
    saved_id,
    timeline_id,
    timeline_title,
    meta,
    machine_learning_job_id,
    max_signals,
    risk_score_mapping,
    rule_name_override,
    severity_mapping,
    tags,
    to,
    threat: threats,
    threshold,
    throttle,
    timestamp_override,
    references,
    note,
    version,
    exceptions_list: listArrayOrUndefined,
    threat_index,
    threat_query,
    threat_filters,
    threat_mapping,
    threat_language,
    threat_indicator_path,
    concurrent_searches,
    items_per_search,
  })
);

export type PatchRulesSchema = t.TypeOf<typeof patchRulesSchema>;

// This type is used after a decode since some things are defaults after a decode.
export type PatchRulesSchemaDecoded = PatchRulesSchema;
