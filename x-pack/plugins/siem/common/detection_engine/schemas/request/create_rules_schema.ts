/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as t from 'io-ts';

/* eslint-disable @typescript-eslint/camelcase */
import {
  actions,
  description,
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
  output_index,
  saved_id,
  timeline_id,
  timeline_title,
  meta,
  machine_learning_job_id,
  risk_score,
  max_signals,
  name,
  severity,
  tags,
  to,
  type,
  threat,
  throttle,
  references,
  note,
  version,
  list,
} from '../common/schemas';
/* eslint-enable @typescript-eslint/camelcase */

export const createRulesSchema = t.exact(
  t.type({
    actions, // TODO: This defaults to an empty array
    anomaly_threshold, // TODO: Runtime validation
    description,
    enabled, // TODO: This defaults to true
    false_positives, // TODO: This defaults to empty array of strings
    filters,
    from, // TODO: This defaults to 'now-6m'
    rule_id,
    index,
    interval, // TODO: This defaults to '5m'
    query, // TODO: Runtime validation and this defaults to empty string ''
    language, // TODO: Defaults to kuery
    output_index,
    saved_id, // TODO: Runtime validation
    timeline_id,
    timeline_title,
    meta,
    machine_learning_job_id, // TODO: Runtime validation
    risk_score,
    max_signals, // TODO: Defaults to DEFAULT_MAX_SIGNALS (100)
    name,
    severity,
    tags, // TODO: Defaults to empty array
    to, // TODO: Defaults to 'now'
    type,
    threat, // TODO: Defaults to empty array
    throttle, // TODO: Defaults to null
    references, // TODO: Defaults to empty array
    note,
    version, // TODO: Defaults to version 1 if not given
    exceptions_list: list, // TODO: Change this schema name to exception_list
  })
);

export type CreateRulesSchema = t.TypeOf<typeof createRulesSchema>;
