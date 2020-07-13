/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as t from 'io-ts';

import { RuleTypeSchema } from '../../../../../common/detection_engine/types';
/* eslint-disable @typescript-eslint/camelcase */
import {
  author,
  building_block_type,
  license,
  risk_score_mapping,
  rule_name_override,
  severity_mapping,
  timestamp_override,
} from '../../../../../common/detection_engine/schemas/common/schemas';
/* eslint-enable @typescript-eslint/camelcase */
import {
  listArray,
  listArrayOrUndefined,
} from '../../../../../common/detection_engine/schemas/types';
import { PatchRulesSchema } from '../../../../../common/detection_engine/schemas/request/patch_rules_schema';

/**
 * Params is an "record", since it is a type of AlertActionParams which is action templates.
 * @see x-pack/plugins/alerts/common/alert.ts
 */
export const action = t.exact(
  t.type({
    group: t.string,
    id: t.string,
    action_type_id: t.string,
    params: t.record(t.string, t.any),
  })
);

export const NewRuleSchema = t.intersection([
  t.type({
    description: t.string,
    enabled: t.boolean,
    interval: t.string,
    name: t.string,
    risk_score: t.number,
    severity: t.string,
    type: RuleTypeSchema,
  }),
  t.partial({
    actions: t.array(action),
    anomaly_threshold: t.number,
    created_by: t.string,
    false_positives: t.array(t.string),
    filters: t.array(t.unknown),
    from: t.string,
    id: t.string,
    index: t.array(t.string),
    language: t.string,
    machine_learning_job_id: t.string,
    max_signals: t.number,
    query: t.string,
    references: t.array(t.string),
    rule_id: t.string,
    saved_id: t.string,
    tags: t.array(t.string),
    threat: t.array(t.unknown),
    throttle: t.union([t.string, t.null]),
    to: t.string,
    updated_by: t.string,
    note: t.string,
    exceptions_list: listArrayOrUndefined,
  }),
]);

export const NewRulesSchema = t.array(NewRuleSchema);
export type NewRule = t.TypeOf<typeof NewRuleSchema>;

export interface AddRulesProps {
  rule: NewRule;
  signal: AbortSignal;
}

export interface PatchRuleProps {
  ruleProperties: PatchRulesSchema;
  signal: AbortSignal;
}

const MetaRule = t.intersection([
  t.type({
    from: t.string,
  }),
  t.partial({
    throttle: t.string,
    kibana_siem_app_url: t.string,
  }),
]);

export const RuleSchema = t.intersection([
  t.type({
    author,
    created_at: t.string,
    created_by: t.string,
    description: t.string,
    enabled: t.boolean,
    false_positives: t.array(t.string),
    from: t.string,
    id: t.string,
    interval: t.string,
    immutable: t.boolean,
    name: t.string,
    max_signals: t.number,
    references: t.array(t.string),
    risk_score: t.number,
    risk_score_mapping,
    rule_id: t.string,
    severity: t.string,
    severity_mapping,
    tags: t.array(t.string),
    type: RuleTypeSchema,
    to: t.string,
    threat: t.array(t.unknown),
    updated_at: t.string,
    updated_by: t.string,
    actions: t.array(action),
    throttle: t.union([t.string, t.null]),
  }),
  t.partial({
    building_block_type,
    anomaly_threshold: t.number,
    filters: t.array(t.unknown),
    index: t.array(t.string),
    language: t.string,
    license,
    last_failure_at: t.string,
    last_failure_message: t.string,
    meta: MetaRule,
    machine_learning_job_id: t.string,
    output_index: t.string,
    query: t.string,
    rule_name_override,
    saved_id: t.string,
    status: t.string,
    status_date: t.string,
    timeline_id: t.string,
    timeline_title: t.string,
    timestamp_override,
    note: t.string,
    exceptions_list: listArray,
    version: t.number,
  }),
]);

export const RulesSchema = t.array(RuleSchema);

export type Rule = t.TypeOf<typeof RuleSchema>;
export type Rules = t.TypeOf<typeof RulesSchema>;

export interface RuleError {
  id?: string;
  rule_id?: string;
  error: { status_code: number; message: string };
}

export type BulkRuleResponse = Array<Rule | RuleError>;

export interface RuleResponseBuckets {
  rules: Rule[];
  errors: RuleError[];
}

export interface PaginationOptions {
  page: number;
  perPage: number;
  total: number;
}

export interface FetchRulesProps {
  pagination?: PaginationOptions;
  filterOptions?: FilterOptions;
  signal: AbortSignal;
}

export interface FilterOptions {
  filter: string;
  sortField: string;
  sortOrder: 'asc' | 'desc';
  showCustomRules?: boolean;
  showElasticRules?: boolean;
  tags?: string[];
}

export interface FetchRulesResponse {
  page: number;
  perPage: number;
  total: number;
  data: Rule[];
}

export interface FetchRuleProps {
  id: string;
  signal: AbortSignal;
}

export interface EnableRulesProps {
  ids: string[];
  enabled: boolean;
}

export interface DeleteRulesProps {
  ids: string[];
}

export interface DuplicateRulesProps {
  rules: Rule[];
}

export interface BasicFetchProps {
  signal: AbortSignal;
}

export interface ImportDataProps {
  fileToImport: File;
  overwrite?: boolean;
  signal: AbortSignal;
}

export interface ImportRulesResponseError {
  rule_id: string;
  error: {
    status_code: number;
    message: string;
  };
}

export interface ImportDataResponse {
  success: boolean;
  success_count: number;
  errors: ImportRulesResponseError[];
}

export interface ExportDocumentsProps {
  ids: string[];
  filename?: string;
  excludeExportDetails?: boolean;
  signal: AbortSignal;
}

export interface RuleStatus {
  current_status: RuleInfoStatus;
  failures: RuleInfoStatus[];
}

export type RuleStatusType = 'executing' | 'failed' | 'going to run' | 'succeeded';
export interface RuleInfoStatus {
  alert_id: string;
  status_date: string;
  status: RuleStatusType | null;
  last_failure_at: string | null;
  last_success_at: string | null;
  last_failure_message: string | null;
  last_success_message: string | null;
  last_look_back_date: string | null | undefined;
  gap: string | null | undefined;
  bulk_create_time_durations: string[] | null | undefined;
  search_after_time_durations: string[] | null | undefined;
}

export type RuleStatusResponse = Record<string, RuleStatus>;

export interface PrePackagedRulesStatusResponse {
  rules_custom_installed: number;
  rules_installed: number;
  rules_not_installed: number;
  rules_not_updated: number;
}
