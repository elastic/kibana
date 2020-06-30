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
  index,
  output_index,
  saved_id,
  timeline_id,
  timeline_title,
  meta,
  machine_learning_job_id,
  risk_score,
  rule_id,
  name,
  severity,
  type,
  note,
  version,
  actions,
  false_positives,
  interval,
  max_signals,
  from,
  enabled,
  tags,
  threat,
  throttle,
  references,
  to,
  language,
  query,
  id,
  building_block_type,
  author,
  license,
  rule_name_override,
  timestamp_override,
  risk_score_mapping,
  severity_mapping,
} from '../common/schemas';
import { listArrayOrUndefined } from '../types/lists';
/* eslint-enable @typescript-eslint/camelcase */

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
    threat,
    throttle,
    timestamp_override,
    references,
    note,
    version,
    exceptions_list: listArrayOrUndefined,
  })
);

export type PatchRulesSchema = t.TypeOf<typeof patchRulesSchema>;

// This type is used after a decode since some things are defaults after a decode.
export type PatchRulesSchemaDecoded = PatchRulesSchema;
