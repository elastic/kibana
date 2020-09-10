/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export interface RuleEcs {
  id?: string[];

  rule_id?: string[];

  false_positives: string[];

  saved_id?: string[];

  timeline_id?: string[];

  timeline_title?: string[];

  max_signals?: number[];

  risk_score?: string[];

  output_index?: string[];

  description?: string[];

  from?: string[];

  immutable?: boolean[];

  index?: string[];

  interval?: string[];

  language?: string[];

  query?: string[];

  references?: string[];

  severity?: string[];

  tags?: string[];

  threat?: unknown;

  type?: string[];

  size?: string[];

  to?: string[];

  enabled?: boolean[];

  filters?: unknown;

  created_at?: string[];

  updated_at?: string[];

  created_by?: string[];

  updated_by?: string[];

  version?: string[];

  note?: string[];
}
